"use client";

import { useCallback, useEffect, useState } from "react";
import { tajClientLog } from "../../lib/clientLog";

type Props = {
  apiBase: string;
  token: string;
  tenantSlug: string;
  /** Si false : liste seule (ex. compte caisse). */
  canMutate?: boolean;
};

type MenuItem = {
  id: string;
  category: string | null;
  name: string;
  description: string | null;
  priceCents: number;
  photoUrl: string | null;
  isAvailable: boolean;
  sortOrder: number;
};

function formatEUR(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function parseEurosToCents(s: string): number {
  const n = Number(String(s).replace(",", ".").trim());
  if (Number.isNaN(n) || n < 0) {
    return 0;
  }
  return Math.round(n * 100);
}

const emptyForm = {
  category: "",
  name: "",
  description: "",
  priceEuros: "",
  photoUrl: "",
  sortOrder: "0",
  isAvailable: true,
};

export function AdminMenuCrud({
  apiBase,
  token,
  tenantSlug,
  canMutate = true,
}: Props) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  /** Chargement liste uniquement — ne pas désactiver les boutons CRUD pendant ce fetch. */
  const [listLoading, setListLoading] = useState(false);
  /** Création / édition / suppression en cours. */
  const [busy, setBusy] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-tenant-slug": tenantSlug,
  };

  const load = useCallback(async () => {
    tajClientLog("menu", "load menu-items start", { tenantSlug });
    setListLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/admin/menu-items`, {
        headers: { Authorization: `Bearer ${token}`, "x-tenant-slug": tenantSlug },
      });
      if (!res.ok) {
        const t = await res.text();
        tajClientLog("menu", "load menu-items fail", res.status, t);
        setMessage(t);
        return;
      }
      const list = (await res.json()) as MenuItem[];
      tajClientLog("menu", "load menu-items ok", list.length);
      setItems(list);
    } catch (e) {
      tajClientLog("menu", "load menu-items error", e);
      setMessage(String(e));
    } finally {
      setListLoading(false);
    }
  }, [apiBase, token, tenantSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createItem() {
    tajClientLog("menu", "createItem click");
    if (!createForm.name.trim()) {
      setMessage("Le nom est obligatoire.");
      return;
    }
    const priceCents = parseEurosToCents(createForm.priceEuros);
    if (priceCents <= 0) {
      setMessage("Prix invalide.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/admin/menu-items`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          category: createForm.category.trim() || undefined,
          name: createForm.name.trim(),
          description: createForm.description.trim() || undefined,
          priceCents,
          photoUrl: createForm.photoUrl.trim() || undefined,
          sortOrder: Number(createForm.sortOrder) || 0,
          isAvailable: createForm.isAvailable,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        tajClientLog("menu", "createItem fail", res.status, t);
        setMessage(t);
        return;
      }
      setCreateForm(emptyForm);
      await load();
      setMessage("Article créé.");
      tajClientLog("menu", "createItem ok");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(it: MenuItem) {
    tajClientLog("menu", "startEdit", it.id);
    setEditingId(it.id);
    setEditForm({
      category: it.category ?? "",
      name: it.name,
      description: it.description ?? "",
      priceEuros: (it.priceCents / 100).toFixed(2),
      photoUrl: it.photoUrl ?? "",
      sortOrder: String(it.sortOrder),
      isAvailable: it.isAvailable,
    });
  }

  async function saveEdit() {
    tajClientLog("menu", "saveEdit", editingId);
    if (!editingId || !editForm.name.trim()) {
      return;
    }
    const priceCents = parseEurosToCents(editForm.priceEuros);
    if (priceCents < 0) {
      setMessage("Prix invalide.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/admin/menu-items/${editingId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          category: editForm.category.trim() || undefined,
          name: editForm.name.trim(),
          description: editForm.description.trim() || undefined,
          priceCents,
          photoUrl: editForm.photoUrl.trim() || undefined,
          sortOrder: Number(editForm.sortOrder) || 0,
          isAvailable: editForm.isAvailable,
        }),
      });
      if (!res.ok) {
        setMessage(await res.text());
        return;
      }
      setEditingId(null);
      await load();
      setMessage("Article mis à jour.");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    tajClientLog("menu", "remove", id);
    if (!globalThis.confirm("Supprimer cet article ?")) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/admin/menu-items/${id}`, {
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
      setMessage("Supprimé.");
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
          Articles ({items.length})
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
        <h3>Nouvel article</h3>
        <div className="crud-grid">
          <label className="field">
            Catégorie
            <input
              value={createForm.category}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, category: e.target.value }))
              }
              placeholder="Plats, Boissons…"
            />
          </label>
          <label className="field">
            Nom *
            <input
              value={createForm.name}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, name: e.target.value }))
              }
            />
          </label>
          <label className="field">
            Prix (€) *
            <input
              value={createForm.priceEuros}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, priceEuros: e.target.value }))
              }
              placeholder="12,90"
            />
          </label>
          <label className="field">
            Ordre
            <input
              value={createForm.sortOrder}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, sortOrder: e.target.value }))
              }
            />
          </label>
          <label className="field full">
            URL photo
            <input
              value={createForm.photoUrl}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, photoUrl: e.target.value }))
              }
              placeholder="https://…"
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
              checked={createForm.isAvailable}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, isAvailable: e.target.checked }))
              }
            />
            Disponible à la vente
          </label>
        </div>
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={() => void createItem()}
        >
          Créer
        </button>
      </div>
      )}

      <div className="admin-grid">
        {items.map((it) => (
          <article key={it.id} className="card admin-dish">
            {canMutate && editingId === it.id ? (
              <div className="admin-dish-body crud-edit">
                <label className="field">
                  Catégorie
                  <input
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, category: e.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  Nom
                  <input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  Prix €
                  <input
                    value={editForm.priceEuros}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, priceEuros: e.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  Ordre
                  <input
                    value={editForm.sortOrder}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, sortOrder: e.target.value }))
                    }
                  />
                </label>
                <label className="field full">
                  URL photo
                  <input
                    value={editForm.photoUrl}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, photoUrl: e.target.value }))
                    }
                  />
                </label>
                <label className="field full">
                  Description
                  <textarea
                    rows={2}
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, description: e.target.value }))
                    }
                  />
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={editForm.isAvailable}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        isAvailable: e.target.checked,
                      }))
                    }
                  />
                  Disponible
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
                <div className="admin-dish-img">
                  {it.photoUrl ? (
                    <img
                      src={it.photoUrl}
                      alt={it.name}
                      width={400}
                      height={220}
                      loading="lazy"
                      decoding="async"
                      style={{
                        objectFit: "cover",
                        width: "100%",
                        height: 160,
                        display: "block",
                      }}
                    />
                  ) : (
                    <div className="ph">Sans photo</div>
                  )}
                </div>
                <div className="admin-dish-body">
                  <span className="cat">{it.category ?? "—"}</span>
                  <h3>{it.name}</h3>
                  {it.description && <p>{it.description}</p>}
                  <div className="row">
                    <strong>{formatEUR(it.priceCents)}</strong>
                    <span className={it.isAvailable ? "ok" : "off"}>
                      {it.isAvailable ? "Actif" : "Indisponible"}
                    </span>
                  </div>
                  {canMutate && (
                    <div className="crud-actions">
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => startEdit(it)}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => void remove(it.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
