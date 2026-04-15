"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  apiBase: string;
  token: string;
  tenantSlug: string;
};

type DriverRow = {
  membershipId: string;
  userId: string;
  email: string;
  displayName: string | null;
  createdAt: string;
};

export function AdminDriversTab({ apiBase, token, tenantSlug }: Props) {
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createName, setCreateName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-tenant-slug": tenantSlug,
  };

  const load = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/admin/drivers`, {
        headers: { Authorization: `Bearer ${token}`, "x-tenant-slug": tenantSlug },
      });
      if (!res.ok) {
        setMessage(await res.text());
        return;
      }
      setDrivers((await res.json()) as DriverRow[]);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }, [apiBase, token, tenantSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createDriver() {
    if (!createEmail.trim() || createPassword.length < 8) {
      setMessage("Email et mot de passe (8 caractères min.) requis.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/admin/drivers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: createEmail.trim(),
          password: createPassword,
          displayName: createName.trim() || undefined,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        setMessage(text);
        return;
      }
      setCreateEmail("");
      setCreatePassword("");
      setCreateName("");
      await load();
      setMessage("Livreur créé — il peut se connecter sur l’app avec ce restaurant (slug) et son email.");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(d: DriverRow) {
    setEditingId(d.membershipId);
    setEditName(d.displayName ?? "");
    setEditPassword("");
  }

  async function saveEdit() {
    if (!editingId) {
      return;
    }
    if (editPassword && editPassword.length < 8) {
      setMessage("Mot de passe : au moins 8 caractères ou laisser vide.");
      return;
    }
    const current = drivers.find((x) => x.membershipId === editingId);
    const body: { displayName?: string; password?: string } = {};
    if (editPassword) {
      body.password = editPassword;
    }
    if (
      current &&
      editName.trim() !== (current.displayName ?? "").trim()
    ) {
      body.displayName = editName.trim();
    }
    if (Object.keys(body).length === 0) {
      setEditingId(null);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/admin/drivers/${editingId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setMessage(await res.text());
        return;
      }
      setEditingId(null);
      await load();
      setMessage("Livreur mis à jour.");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(membershipId: string) {
    if (!globalThis.confirm("Retirer ce livreur du restaurant ? Il ne pourra plus se connecter pour ce slug.")) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/admin/drivers/${membershipId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "x-tenant-slug": tenantSlug },
      });
      if (!res.ok) {
        setMessage(await res.text());
        return;
      }
      if (editingId === membershipId) {
        setEditingId(null);
      }
      await load();
      setMessage("Accès livreur retiré.");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="toolbar">
        <h2>Livreurs ({drivers.length})</h2>
        <button type="button" className="btn ghost" onClick={() => void load()}>
          Recharger
        </button>
      </div>
      <p className="muted small">
        Chaque livreur reçoit un compte (email + mot de passe). Connexion :{" "}
        <code>POST /auth/login</code> avec <code>tenantSlug</code> :{" "}
        <strong>{tenantSlug}</strong> — même flux que la caisse ou la cuisine.
      </p>
      {message && (
        <div className="banner" role="status">
          {message}
        </div>
      )}

      <div className="card form-section crud-form">
        <h3>Ajouter un livreur</h3>
        <div className="crud-grid">
          <label className="field">
            Email *
            <input
              type="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="field">
            Mot de passe * (min. 8)
            <input
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label className="field full">
            Nom affiché
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Prénom Nom"
            />
          </label>
        </div>
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={() => void createDriver()}
        >
          Créer le compte livreur
        </button>
      </div>

      <ul className="driver-list">
        {drivers.map((d) => (
          <li key={d.membershipId} className="card">
            {editingId === d.membershipId ? (
              <div className="crud-edit">
                <label className="field">
                  Nom affiché
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </label>
                <label className="field">
                  Nouveau mot de passe (optionnel)
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Laisser vide pour ne pas changer"
                  />
                </label>
                <div className="crud-actions">
                  <button
                    type="button"
                    className="btn primary"
                    disabled={busy}
                    onClick={() => void saveEdit()}
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setEditingId(null)}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="driver-row">
                  <div>
                    <strong>{d.displayName || d.email}</strong>
                    <p className="muted small">{d.email}</p>
                    <p className="small muted">
                      Depuis le{" "}
                      {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="crud-actions">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => startEdit(d)}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => void remove(d.membershipId)}
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
