import { OAUTH_AUTH_METHODS } from "../../authMethods";
import type { AppUser } from "../../types";
import { AuthDialog } from "../AuthDialog";
import "./BrandCard.css";

type BrandCardProps = {
  user: AppUser | null;
  isAuthDialogOpen: boolean;
  isSupabaseConfigured: boolean;
  isSendingMagicLink: boolean;
  pendingAuthProviderId: string | null;
  authMessage: string | null;
  onAuthDialogOpenChange: (isOpen: boolean) => void;
  onSendMagicLink: (email: string) => Promise<void>;
  onSignInWithProvider: (
    providerId: string,
    provider: (typeof OAUTH_AUTH_METHODS)[number]["provider"],
    scopes: string,
  ) => Promise<void>;
  onSignOut: () => Promise<void>;
};

export function BrandCard({
  user,
  isAuthDialogOpen,
  isSupabaseConfigured,
  isSendingMagicLink,
  pendingAuthProviderId,
  authMessage,
  onAuthDialogOpenChange,
  onSendMagicLink,
  onSignInWithProvider,
  onSignOut,
}: BrandCardProps) {
  return (
    <div className="brand-card">
      <span className="brand-badge" aria-hidden="true">
        K
      </span>
      <div className="brand-copy">
        <h1>Короче, Курск</h1>
        <p>Путеводитель для местных</p>
      </div>
      <div className="brand-auth">
        {user ? (
          <>
            <span className="brand-account" title={user.email ?? undefined}>
              {user.email ?? "Аккаунт"}
            </span>
            <button className="brand-auth-button" type="button" onClick={() => void onSignOut()}>
              Выйти
            </button>
          </>
        ) : (
          <button
            className="brand-auth-button"
            type="button"
            onClick={() => onAuthDialogOpenChange(true)}
          >
            Войти
          </button>
        )}
      </div>
      <AuthDialog
        isOpen={isAuthDialogOpen}
        isConfigured={isSupabaseConfigured}
        isSendingMagicLink={isSendingMagicLink}
        pendingAuthProviderId={pendingAuthProviderId}
        message={authMessage}
        authMethods={OAUTH_AUTH_METHODS}
        onClose={() => onAuthDialogOpenChange(false)}
        onSendMagicLink={onSendMagicLink}
        onSignInWithProvider={onSignInWithProvider}
      />
    </div>
  );
}
