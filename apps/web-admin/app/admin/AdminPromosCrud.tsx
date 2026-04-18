"use client";

import { useCallback, useEffect, useState } from "react";
import { tajClientLog } from "../../lib/clientLog";

type Props = {
  apiBase: string;
  token: string;
  tenantSlug: string;
  canMutate?: boolean;
};

type Promotion = {
  id: string;
  title: string;
  description: string | null;
  percentOff: unknown;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

function pct(p: unknown): string {
  if (p === null || p === undefined) {
    return "—";
  }
  return String(p);
}

function toLocalInput(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(s: string): string | undefined {
  if (!s.trim()) {
    return undefined;
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    return undefined;
  }
  return d.toISOString();
}

const emptyCreate = {
  title: "",
  description: "",
  percentOff: "",
  startsAt: "",
  endsAt: "",
  active: true,
};

export function AdminPromosCrud({
  apiBase,
  token,
  tenantSlug,
  canMutate = true,
}: Props) {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyCreate);

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-tenant-slug": tenantSlug,
  };

  const load = useCallback(async () => {
    tajClientLog("promos", "load start", { tenantSlug });
    setListLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/admin/promotions`, {
        headers: { Authorization: `Bearer ${token}`, "x-tenant-slug": tenantSlug },
      });
      if (!res.ok) {
        const t = await res.text();
        tajClientLog("promos", "load fail", res.status, t);
        setMessage(t);
        return;
      }
      const list = (await res.json()) as Promotion[];
      tajClientLog("promos", "load ok", list.length);
      setPromos(list);
    } catch (e) {
      tajClientLog("promos", "load error", e);
      setMessage(String(e));
    } finally {
      setListLoading(false);
    }
  }, [apiBase, token, tenantSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createPromo() {
    tajClientLog("promos", "createPromo click");
    if (!createForm.title.trim()) {
      setMessage("Titre obligatoire.");
      return;
    }
    const percentOff = createForm.percentOff.trim()
      ? Number(createForm.percentOff.replace(",", "."))
      : undefined;
    if (
      percentOff !== undefined &&
      (Number.isNaN(percentOff) || percentOff < 0 || percentOff > 100)
    ) {
      setMessage("Pourcentage invalide (0–100).");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/admin/promotions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: createForm.title.trim(),
          description: createForm.description.trim() || undefined,
          percentOff,
          startsAt: fromLocalInput(createForm.startsAt),
          endsAt: fromLocalInput(createForm.endsAt),
          active: createForm.active,
        }),
      });
      if (!res.ok) {
        setMessage(await res.text());
        return;
      }
      setCreateForm(emptyCreate);
      await load();
      setMessage("Promotion créée.");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(p: Promotion) {
    tajClientLog("promos", "startEdit", p.id);
    setEditingId(p.id);
    setEditForm({
      title: p.title,
      description: p.description ?? "",
      percentOff:
        p.percentOff !== null && p.percentOff !== undefined
          ? String(p.percentOff)
          : "",
      startsAt: toLocalInput(p.startsAt),
      endsAt: toLocalInput(p.endsAt),
      active: p.active,
    });
  }

  async function saveEdit() {
    tajClientLog("promos", "saveEdit", editingId);
    if (!editingId || !editForm.title.trim()) {
      return;
    }
    const percentOff = editForm.percentOff.trim()
      ? Number(editForm.percentOff.replace(",", "."))
      : undefined;
    if (
      percentOff !== undefined &&
      (Number.isNaN(percentOff) || percentOff < 0 || percentOff > 100)
    ) {
      setMessage("Pourcentage invalide.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/admin/promotions/${editingId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          title: editForm.title.trim(),
          description: editForm.description.trim() || undefined,
          percentOff,
          startsAt: fromLocalInput(editForm.startsAt),
          endsAt: fromLocalInput(editForm.endsAt),
          active: editForm.active,
        }),
      });
      if (!res.ok) {
        setMessage(await res.text());
        return;
      }
      setEditingId(null);
      await load();
      setMessage("Promotion mise à jour.");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    tajClientLog("promos", "remove", id);
    if (!globalThis.confirm("Supprimer cette promotion ?")) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/admin/promotions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "x-tenant-slug": tenantSlug },
      });
      if (!res.ok) {
        setMessage(await res.text());
        return;
      }
      if (editingId === id) {
        setEditingId(null);
      }
      await load();
      setMessage("Supprimée.");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="toolbar">
        <h2>
          Promotions ({promos.length})
          {listLoading ? (
            <span className="muted small"> — chargement…</span>
          ) : null}
        </h2>
        <button
          type="button"
          className="btn ghost"
          disabled={listLoading}
          onClick={() => void load()}
        >
          Recharger
        </button>
      </div>
      {message && (
        <div className="banner" role="status">
          {message}
        </div>
      )}

      {canMutate && (
      <div className="card form-section crud-form">
        <h3>Nouvelle promotion</h3>
        <div className="crud-grid">
          <label className="field">
            Titre *
            <input
              value={createForm.title}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, title: e.target.value }))
              }
            />
          </label>
          <label className="field">
            Réduction %
            <input
              value={createForm.percentOff}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, percentOff: e.target.value }))
              }
              placeholder="10"
            />
          </label>
          <label className="field">
            Début
            <input
              type="datetime-local"
              value={createForm.startsAt}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, startsAt: e.target.value }))
              }
            />
          </label>
          <label className="field">
            Fin
            <input
              type="datetime-local"
              value={createForm.endsAt}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, endsAt: e.target.value }))
              }
            />
          </label>
          <label className="field full">
            Description
            <textarea
              rows={2}
              value={createForm.description}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={createForm.active}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, active: e.target.checked }))
              }
            />
            Active
          </label>
        </div>
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={() => void createPromo()}
        >
          Créer
        </button>
      </div>
      )}

      <ul className="promo-list">
        {promos.map((p) => (
          <li key={p.id} className="card">
            {canMutate && editingId === p.id ? (
              <div className="crud-edit">
                <div className="crud-grid">
                  <label className="field">
                    Titre
                    <input
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, title: e.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    Réduction %
                    <input
                      value={editForm.percentOff}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, percentOff: e.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    Début
                    <input
                      type="datetime-local"
                      value={editForm.startsAt}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, startsAt: e.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    Fin
                    <input
                      type="datetime-local"
                      value={editForm.endsAt}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, endsAt: e.target.value }))
                      }
                    />
                  </label>
                  <label className="field full">
                    Description
                    <textarea
                      rows={2}
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={editForm.active}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, active: e.target.checked }))
                      }
                    />
                    Active
                  </label>
                </div>
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
                <strong>{p.title}</strong>
                {p.description && <p className="muted">{p.description}</p>}
                <p className="small">
                  Réduction : {pct(p.percentOff)}% ·{" "}
                  {p.active ? "Active" : "Inactive"}
                  {p.startsAt && (
                    <>
                      {" "}
                      · du {new Date(p.startsAt).toLocaleString("fr-FR")}
                    </>
                  )}
                  {p.endsAt && (
                    <>
                      {" "}
                      au {new Date(p.endsAt).toLocaleString("fr-FR")}
                    </>
                  )}
                </p>
                {canMutate && (
                  <div className="crud-actions">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => startEdit(p)}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => void remove(p.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
