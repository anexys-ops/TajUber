"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  apiBase: string;
  token: string;
  tenantSlug: string;
};

type RestaurantDto = {
  name: string;
  brandName: string | null;
  restaurantStreet: string | null;
  restaurantCity: string | null;
  restaurantPostalCode: string | null;
  restaurantCountry: string | null;
  restaurantPhone: string | null;
  restaurantEmail: string | null;
  restaurantDescription: string | null;
  openingHoursJson: string | null;
  isOpenNow: boolean;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  paymentsStripeEnabled: boolean;
  paymentsCashEnabled: boolean;
  paymentsQontoEnabled: boolean;
  paymentsMealVoucherEnabled: boolean;
  qontoPaymentNote: string | null;
  mealVoucherNote: string | null;
  stripeConnectChargesEnabled: boolean;
  stripeConnectAccountId: string | null;
};

function tenantAdminFromJwt(jwt: string): boolean {
  try {
    const json = JSON.parse(atob(jwt.split(".")[1])) as {
      role?: string;
    };
    return json.role === "TENANT_ADMIN";
  } catch {
    return false;
  }
}

export function AdminRestaurantTab({ apiBase, token, tenantSlug }: Props) {
  const [data, setData] = useState<RestaurantDto | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canEdit = tenantAdminFromJwt(token);

  const load = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/admin/restaurant`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": tenantSlug,
        },
      });
      if (!res.ok) {
        setMessage(await res.text());
        return;
      }
      setData((await res.json()) as RestaurantDto);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }, [apiBase, token, tenantSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(patch: Partial<RestaurantDto>) {
    if (!canEdit) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const body = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined),
      );
      if (Object.keys(body).length === 0) {
        setBusy(false);
        return;
      }

      const res = await fetch(`${apiBase}/admin/restaurant`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-tenant-slug": tenantSlug,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setMessage(await res.text());
        return;
      }
      setMessage("Enregistré.");
      await load();
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <section className="card">
        <p className="muted">{busy ? "Chargement…" : message ?? "—"}</p>
        <button type="button" className="btn ghost" onClick={() => void load()}>
          Réessayer
        </button>
      </section>
    );
  }

  return (
    <section className="restaurant-settings">
      <div className="toolbar">
        <h2>Restaurant &amp; livraison</h2>
        <button type="button" className="btn ghost" onClick={() => void load()}>
          Recharger
        </button>
      </div>
      {message && (
        <div className="banner" role="status">
          {message}
        </div>
      )}
      <div className={`open-badge ${data.isOpenNow ? "open" : "closed"}`}>
        {data.isOpenNow
          ? "Ouvert maintenant (selon horaires)"
          : "Fermé maintenant (selon horaires)"}
      </div>
      {!canEdit && (
        <p className="muted small">
          Lecture seule — connectez-vous avec un compte{" "}
          <strong>admin restaurant</strong> pour modifier.
        </p>
      )}

      <div className="card form-section">
        <h3>Fiche</h3>
        <p className="muted small">
          Ces infos peuvent être exposées au site / app via{" "}
          <code>GET /catalog/restaurant</code>.
        </p>
        <RestaurantForm
          data={data}
          disabled={!canEdit || busy}
          onSave={(p) => void save(p)}
        />
      </div>

      <div className="card form-section">
        <h3>Moyens de paiement acceptés (configuration)</h3>
        <p className="muted small">
          Stripe Connect : encaissement carte côté restaurant. Espèces, ticket
          restaurant et virement Qonto sont suivis en caisse pour les stats.
        </p>
        <div className="check-grid">
          <label className="check">
            <input
              type="checkbox"
              checked={data.paymentsStripeEnabled}
              disabled={!canEdit || busy}
              onChange={(e) =>
                void save({ paymentsStripeEnabled: e.target.checked })
              }
            />
            Carte (Stripe Connect)
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={data.paymentsCashEnabled}
              disabled={!canEdit || busy}
              onChange={(e) =>
                void save({ paymentsCashEnabled: e.target.checked })
              }
            />
            Espèces
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={data.paymentsQontoEnabled}
              disabled={!canEdit || busy}
              onChange={(e) =>
                void save({ paymentsQontoEnabled: e.target.checked })
              }
            />
            Virement / Qonto (SEPA)
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={data.paymentsMealVoucherEnabled}
              disabled={!canEdit || busy}
              onChange={(e) =>
                void save({ paymentsMealVoucherEnabled: e.target.checked })
              }
            />
            Titres restaurant
          </label>
        </div>
        <p className="small muted">
          Stripe prêt à encaisser :{" "}
          {data.stripeConnectChargesEnabled ? "oui" : "non — finalisez Connect"}
          {data.stripeConnectAccountId && (
            <>
              {" "}
              · compte <code>{data.stripeConnectAccountId.slice(0, 12)}…</code>
            </>
          )}
        </p>
        <label className="field">
          Note Qonto / virement (IBAN, référence)
          <textarea
            rows={2}
            defaultValue={data.qontoPaymentNote ?? ""}
            disabled={!canEdit || busy}
            onBlur={(e) => {
              if (e.target.value !== (data.qontoPaymentNote ?? "")) {
                void save({ qontoPaymentNote: e.target.value || null });
              }
            }}
          />
        </label>
        <label className="field">
          Note titres restaurant (émetteurs, règles)
          <textarea
            rows={2}
            defaultValue={data.mealVoucherNote ?? ""}
            disabled={!canEdit || busy}
            onBlur={(e) => {
              if (e.target.value !== (data.mealVoucherNote ?? "")) {
                void save({ mealVoucherNote: e.target.value || null });
              }
            }}
          />
        </label>
      </div>
    </section>
  );
}

function RestaurantForm({
  data,
  disabled,
  onSave,
}: {
  data: RestaurantDto;
  disabled: boolean;
  onSave: (p: Partial<RestaurantDto>) => void;
}) {
  return (
    <div className="restaurant-form-grid">
      <label className="field">
        Adresse
        <input
          defaultValue={data.restaurantStreet ?? ""}
          disabled={disabled}
          onBlur={(e) => {
            if (e.target.value !== (data.restaurantStreet ?? "")) {
              onSave({ restaurantStreet: e.target.value || null });
            }
          }}
        />
      </label>
      <label className="field">
        Code postal
        <input
          defaultValue={data.restaurantPostalCode ?? ""}
          disabled={disabled}
          onBlur={(e) => {
            if (e.target.value !== (data.restaurantPostalCode ?? "")) {
              onSave({ restaurantPostalCode: e.target.value || null });
            }
          }}
        />
      </label>
      <label className="field">
        Ville
        <input
          defaultValue={data.restaurantCity ?? ""}
          disabled={disabled}
          onBlur={(e) => {
            if (e.target.value !== (data.restaurantCity ?? "")) {
              onSave({ restaurantCity: e.target.value || null });
            }
          }}
        />
      </label>
      <label className="field">
        Téléphone
        <input
          defaultValue={data.restaurantPhone ?? ""}
          disabled={disabled}
          onBlur={(e) => {
            if (e.target.value !== (data.restaurantPhone ?? "")) {
              onSave({ restaurantPhone: e.target.value || null });
            }
          }}
        />
      </label>
      <label className="field">
        Email
        <input
          defaultValue={data.restaurantEmail ?? ""}
          disabled={disabled}
          onBlur={(e) => {
            if (e.target.value !== (data.restaurantEmail ?? "")) {
              onSave({ restaurantEmail: e.target.value || null });
            }
          }}
        />
      </label>
      <label className="field full">
        Description
        <textarea
          rows={3}
          defaultValue={data.restaurantDescription ?? ""}
          disabled={disabled}
          onBlur={(e) => {
            if (e.target.value !== (data.restaurantDescription ?? "")) {
              onSave({ restaurantDescription: e.target.value || null });
            }
          }}
        />
      </label>
      <label className="field full">
        Horaires (JSON)
        <textarea
          rows={8}
          className="mono"
          defaultValue={data.openingHoursJson ?? "{}"}
          disabled={disabled}
          onBlur={(e) => {
            if (e.target.value !== (data.openingHoursJson ?? "")) {
              onSave({ openingHoursJson: e.target.value || null });
            }
          }}
        />
      </label>
      <p className="muted small full">
        Clés : <code>mon</code> … <code>sun</code>. Ex.{" "}
        <code>{`{"mon":{"open":"11:30","close":"22:00","closed":false}}`}</code>
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={data.deliveryEnabled}
          disabled={disabled}
          onChange={(e) => onSave({ deliveryEnabled: e.target.checked })}
        />
        Livraison activée (si ouvert)
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={data.pickupEnabled}
          disabled={disabled}
          onChange={(e) => onSave({ pickupEnabled: e.target.checked })}
        />
        Click &amp; collect activé (si ouvert)
      </label>
    </div>
  );
}
