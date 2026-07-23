import { useEffect, useState } from "react";
import Alert from "../../components/common/Alert";
import Spinner from "../../components/common/Spinner";
import { useAuth } from "../auth/AuthContext";
import { friendlyError } from "../../lib/errors";
import { formatDateTime } from "../../lib/formatters";
import {
  createBlockedPeriod,
  deleteBlockedPeriod,
  getProfile,
  listBlockedPeriods,
  listBusinessHours,
  saveBusinessHours,
  updateProfile,
  uploadBusinessLogo,
} from "./settingsService";

const week = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
const defaultHours = week.map((_, weekday) => ({
  weekday,
  start_time: "09:00",
  end_time: "18:00",
  enabled: weekday > 0 && weekday < 6,
  break_start: "",
  break_end: "",
}));
const emptyBlock = { starts_at: "", ends_at: "", reason: "" };
const slugify = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

export default function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [hours, setHours] = useState(defaultHours);
  const [blocks, setBlocks] = useState([]);
  const [block, setBlock] = useState(emptyBlock);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [savedSlug, setSavedSlug] = useState("");
  const [savedPublicEnabled, setSavedPublicEnabled] = useState(false);

  useEffect(() => {
    Promise.all([getProfile(), listBusinessHours(), listBlockedPeriods()])
      .then(([profileData, hoursData, blocksData]) => {
        setProfile(profileData);
        setSavedSlug(profileData.slug ?? "");
        setSavedPublicEnabled(profileData.public_booking_enabled);
        setBlocks(blocksData);
        if (hoursData.length)
          setHours(
            defaultHours.map(
              (fallback) =>
                hoursData.find((item) => item.weekday === fallback.weekday) ??
                fallback,
            ),
          );
      })
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, []);

  function showSuccess(value) {
    setMessage(value);
    setError("");
  }
  async function submitProfile(event) {
    event.preventDefault();
    setSaving("profile");
    try {
      const slug = slugify(profile.slug ?? "") || null;
      const updated = await updateProfile(profile.id, {
        full_name: profile.full_name.trim(),
        business_name: profile.business_name?.trim() || null,
        phone: profile.phone?.trim() || null,
        bio: profile.bio?.trim() || null,
        slug,
        public_booking_enabled: profile.public_booking_enabled,
        address: profile.address?.trim() || null,
        instagram: profile.instagram?.trim().replace(/^@/, "") || null,
        logo_url: profile.logo_url || null,
        booking_min_notice_minutes: Number(
          profile.booking_min_notice_minutes ?? 120,
        ),
        booking_window_days: Number(profile.booking_window_days ?? 30),
        slot_interval_minutes: Number(profile.slot_interval_minutes ?? 30),
        cancellation_policy: profile.cancellation_policy?.trim() || null,
        confirmation_message: profile.confirmation_message?.trim() || null,
        accepted_payments: profile.accepted_payments ?? [],
        allow_custom_requests: profile.allow_custom_requests ?? true,
        custom_request_duration_minutes: Number(
          profile.custom_request_duration_minutes ?? 60,
        ),
      });
      setProfile(updated);
      setSavedSlug(updated.slug ?? "");
      setSavedPublicEnabled(updated.public_booking_enabled);
      showSuccess("Perfil atualizado com sucesso.");
    } catch (err) {
      if (err.code === "23505")
        setError("Este link público já está em uso. Escolha outro.");
      else if (err.code === "23514")
        setError(
          "Um dos campos não está no formato permitido. Revise os dados.",
        );
      else if (err.code === "42501")
        setError(
          "Sua sessão não tem permissão para alterar este perfil. Entre novamente.",
        );
      else
        setError(
          `Não foi possível salvar o perfil${err.message ? `: ${err.message}` : "."}`,
        );
    } finally {
      setSaving("");
    }
  }
  async function changeLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 2 MB.");
      return;
    }
    setLogoUploading(true);
    try {
      const logoUrl = await uploadBusinessLogo(user.id, file);
      setProfile((current) => ({ ...current, logo_url: logoUrl }));
      showSuccess("Logo enviado. Clique em Salvar perfil para confirmar.");
    } catch (err) {
      setError(`Não foi possível enviar a imagem: ${err.message}`);
    } finally {
      setLogoUploading(false);
    }
  }
  async function submitHours(event) {
    event.preventDefault();
    setSaving("hours");
    try {
      setHours(
        await saveBusinessHours(
          user.id,
          hours.map(
            ({
              weekday,
              start_time,
              end_time,
              enabled,
              break_start,
              break_end,
            }) => ({
              weekday,
              start_time,
              end_time,
              enabled,
              break_start: break_start || null,
              break_end: break_end || null,
            }),
          ),
        ),
      );
      showSuccess("Horários de funcionamento salvos.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving("");
    }
  }
  async function submitBlock(event) {
    event.preventDefault();
    setSaving("block");
    try {
      const created = await createBlockedPeriod(
        {
          starts_at: new Date(block.starts_at).toISOString(),
          ends_at: new Date(block.ends_at).toISOString(),
          reason: block.reason.trim() || null,
        },
        user.id,
      );
      setBlocks((items) =>
        [...items, created].sort(
          (a, b) => new Date(a.starts_at) - new Date(b.starts_at),
        ),
      );
      setBlock(emptyBlock);
      showSuccess("Período bloqueado.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving("");
    }
  }
  async function removeBlock(id) {
    try {
      await deleteBlockedPeriod(id);
      setBlocks((items) => items.filter((item) => item.id !== id));
    } catch (err) {
      setError(friendlyError(err));
    }
  }
  if (loading) return <Spinner label="Carregando configurações…" />;
  if (!profile)
    return (
      <section className="page">
        <Alert type="error">{error}</Alert>
      </section>
    );
  return (
    <section className="page narrow settings-page">
      <div className="page-heading">
        <p className="eyebrow">Seu negócio</p>
        <h1>Configurações</h1>
        <p>
          Defina sua identidade, horários disponíveis e períodos de ausência.
        </p>
      </div>
      {message && <Alert type="success">{message}</Alert>}
      {error && <Alert type="error">{error}</Alert>}
      <form className="card settings-section" onSubmit={submitProfile}>
        <div className="section-heading">
          <div>
            <h2>Perfil profissional</h2>
            <p>Essas informações serão usadas na sua página de agendamento.</p>
          </div>
        </div>
        <div className="form-grid">
          <div className="logo-field full">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt="Logo atual do negócio" />
            ) : (
              <div>{(profile.business_name || profile.full_name)[0]}</div>
            )}
            <label>
              Logo do negócio
              <input
                id="business-logo"
                className="file-input-hidden"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={changeLogo}
                disabled={logoUploading}
              />
              <span className="file-picker-button">
                {logoUploading ? "Enviando imagem…" : "Escolher imagem"}
              </span>
              <small>PNG, JPG ou WebP de até 2 MB.</small>
            </label>
          </div>
          <label>
            Seu nome
            <input
              value={profile.full_name}
              onChange={(e) =>
                setProfile({ ...profile, full_name: e.target.value })
              }
              required
            />
          </label>
          <label>
            Nome do negócio
            <input
              value={profile.business_name ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, business_name: e.target.value })
              }
            />
          </label>
          <label>
            Telefone / WhatsApp
            <input
              value={profile.phone ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, phone: e.target.value })
              }
            />
          </label>
          <label>
            Instagram
            <input
              value={profile.instagram ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, instagram: e.target.value })
              }
              placeholder="@seunegocio"
            />
          </label>
          <label className="full">
            Endereço físico
            <input
              value={profile.address ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, address: e.target.value })
              }
              placeholder="Rua, número, bairro e cidade"
            />
          </label>
          <label>
            Nome do link público
            <input
              value={profile.slug ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, slug: slugify(e.target.value) })
              }
              placeholder="programingzxx"
              maxLength="80"
            />
            <small>
              Não é seu endereço físico. Seu link será: /agendar/
              {profile.slug || "seu-negocio"}
            </small>
            {savedSlug &&
              savedPublicEnabled &&
              profile.slug === savedSlug &&
              profile.public_booking_enabled === savedPublicEnabled && (
                <span className="public-link-actions">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/agendar/${savedSlug}`,
                      );
                      showSuccess("Link público copiado.");
                    }}
                  >
                    Copiar link
                  </button>
                  <a
                    href={`/agendar/${savedSlug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir página ↗
                  </a>
                </span>
              )}
            {(profile.slug !== savedSlug ||
              profile.public_booking_enabled !== savedPublicEnabled) && (
              <small className="field-warning">
                Salve o perfil para ativar este endereço público.
              </small>
            )}
            {profile.slug === savedSlug && !savedPublicEnabled && (
              <small className="field-warning">
                Marque “Permitir solicitações pela página pública” e salve para
                liberar o link.
              </small>
            )}
          </label>
          <label className="full">
            Apresentação
            <textarea
              rows="4"
              value={profile.bio ?? ""}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            />
          </label>
          <label className="full">
            Política de cancelamento
            <textarea
              rows="3"
              value={profile.cancellation_policy ?? ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  cancellation_policy: e.target.value,
                })
              }
              placeholder="Exemplo: cancelamentos devem ser avisados com 2 horas de antecedência."
            />
          </label>
          <label className="full">
            Mensagem após o agendamento
            <textarea
              rows="3"
              value={profile.confirmation_message ?? ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  confirmation_message: e.target.value,
                })
              }
              placeholder="Exemplo: aguarde nossa confirmação pelo WhatsApp."
            />
          </label>
          <fieldset className="payment-options full">
            <legend>Formas de pagamento aceitas</legend>
            {["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito"].map(
              (method) => (
                <label className="checkbox" key={method}>
                  <input
                    type="checkbox"
                    checked={(profile.accepted_payments ?? []).includes(method)}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        accepted_payments: event.target.checked
                          ? [...(profile.accepted_payments ?? []), method]
                          : (profile.accepted_payments ?? []).filter(
                              (item) => item !== method,
                            ),
                      })
                    }
                  />
                  {method}
                </label>
              ),
            )}
          </fieldset>
          <label>
            Antecedência mínima
            <select
              value={profile.booking_min_notice_minutes ?? 120}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  booking_min_notice_minutes: e.target.value,
                })
              }
            >
              <option value="0">Sem antecedência</option>
              <option value="60">1 hora</option>
              <option value="120">2 horas</option>
              <option value="360">6 horas</option>
              <option value="1440">1 dia</option>
            </select>
          </label>
          <label>
            Agenda aberta por
            <select
              value={profile.booking_window_days ?? 30}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  booking_window_days: e.target.value,
                })
              }
            >
              <option value="7">7 dias</option>
              <option value="15">15 dias</option>
              <option value="30">30 dias</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
            </select>
          </label>
          <label>
            Intervalo da grade
            <select
              value={profile.slot_interval_minutes ?? 30}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  slot_interval_minutes: e.target.value,
                })
              }
            >
              <option value="15">A cada 15 minutos</option>
              <option value="30">A cada 30 minutos</option>
              <option value="60">A cada 1 hora</option>
            </select>
          </label>
          <label className="checkbox full">
            <input
              type="checkbox"
              checked={profile.public_booking_enabled}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  public_booking_enabled: e.target.checked,
                })
              }
            />{" "}
            Permitir solicitações pela página pública
          </label>
          <div className="custom-request-setting full">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={profile.allow_custom_requests ?? true}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    allow_custom_requests: e.target.checked,
                  })
                }
              />
              <span>
                <strong>Aceitar pedidos personalizados</strong>
                <small>
                  O cliente descreve livremente o que precisa, sem escolher um
                  serviço do catálogo.
                </small>
              </span>
            </label>
            {(profile.allow_custom_requests ?? true) && (
              <label>
                Tempo reservado para avaliar o pedido
                <select
                  value={profile.custom_request_duration_minutes ?? 60}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      custom_request_duration_minutes: e.target.value,
                    })
                  }
                >
                  <option value="30">30 minutos</option>
                  <option value="60">1 hora</option>
                  <option value="90">1 hora e 30 minutos</option>
                  <option value="120">2 horas</option>
                </select>
              </label>
            )}
          </div>
        </div>
        <div className="form-actions">
          <button
            className="button button-primary"
            disabled={saving === "profile"}
          >
            Salvar perfil
          </button>
        </div>
      </form>
      <form className="card settings-section" onSubmit={submitHours}>
        <div className="section-heading">
          <div>
            <h2>Horários de trabalho</h2>
            <p>Informe em quais dias sua agenda pode receber atendimentos.</p>
          </div>
        </div>
        <div className="hours-list">
          {hours.map((item, index) => (
            <div className="hours-row" key={item.weekday}>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) =>
                    setHours((current) =>
                      current.map((entry, itemIndex) =>
                        itemIndex === index
                          ? { ...entry, enabled: e.target.checked }
                          : entry,
                      ),
                    )
                  }
                />
                {week[item.weekday]}
              </label>
              <input
                type="time"
                value={String(item.start_time).slice(0, 5)}
                disabled={!item.enabled}
                onChange={(e) =>
                  setHours((current) =>
                    current.map((entry, itemIndex) =>
                      itemIndex === index
                        ? { ...entry, start_time: e.target.value }
                        : entry,
                    ),
                  )
                }
              />
              <div className="break-fields">
                <small>Intervalo</small>
                <input
                  type="time"
                  value={String(item.break_start ?? "").slice(0, 5)}
                  disabled={!item.enabled}
                  onChange={(e) =>
                    setHours((current) =>
                      current.map((entry, itemIndex) =>
                        itemIndex === index
                          ? { ...entry, break_start: e.target.value }
                          : entry,
                      ),
                    )
                  }
                />
                <span>–</span>
                <input
                  type="time"
                  value={String(item.break_end ?? "").slice(0, 5)}
                  disabled={!item.enabled}
                  onChange={(e) =>
                    setHours((current) =>
                      current.map((entry, itemIndex) =>
                        itemIndex === index
                          ? { ...entry, break_end: e.target.value }
                          : entry,
                      ),
                    )
                  }
                />
              </div>
              <span>até</span>
              <input
                type="time"
                value={String(item.end_time).slice(0, 5)}
                disabled={!item.enabled}
                onChange={(e) =>
                  setHours((current) =>
                    current.map((entry, itemIndex) =>
                      itemIndex === index
                        ? { ...entry, end_time: e.target.value }
                        : entry,
                    ),
                  )
                }
              />
            </div>
          ))}
        </div>
        <div className="form-actions">
          <button
            className="button button-primary"
            disabled={saving === "hours"}
          >
            Salvar horários
          </button>
        </div>
      </form>
      <section className="card settings-section">
        <div className="section-heading">
          <div>
            <h2>Bloqueios e folgas</h2>
            <p>Reserve férias, compromissos e horários indisponíveis.</p>
          </div>
        </div>
        <form className="block-form" onSubmit={submitBlock}>
          <label>
            Início
            <input
              type="datetime-local"
              value={block.starts_at}
              onChange={(e) =>
                setBlock({ ...block, starts_at: e.target.value })
              }
              required
            />
          </label>
          <label>
            Término
            <input
              type="datetime-local"
              value={block.ends_at}
              min={block.starts_at}
              onChange={(e) => setBlock({ ...block, ends_at: e.target.value })}
              required
            />
          </label>
          <label>
            Motivo
            <input
              value={block.reason}
              onChange={(e) => setBlock({ ...block, reason: e.target.value })}
              placeholder="Folga, almoço…"
            />
          </label>
          <button
            className="button button-secondary"
            disabled={saving === "block"}
          >
            Adicionar bloqueio
          </button>
        </form>
        <div className="blocks-list">
          {blocks.length === 0 ? (
            <p className="muted">Nenhum período futuro bloqueado.</p>
          ) : (
            blocks.map((item) => (
              <div key={item.id}>
                <div>
                  <strong>{item.reason || "Indisponível"}</strong>
                  <small>
                    {formatDateTime(item.starts_at)} até{" "}
                    {formatDateTime(item.ends_at)}
                  </small>
                </div>
                <button onClick={() => removeBlock(item.id)}>Remover</button>
              </div>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
