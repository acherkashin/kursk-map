import { useEffect, useId, useState, type FormEvent } from "react";
import type { OAuthAuthMethod } from "../../authMethods";
import "./AuthDialog.css";

type AuthDialogProps = {
  isOpen: boolean;
  isConfigured: boolean;
  isSendingMagicLink: boolean;
  pendingAuthProviderId: string | null;
  message: string | null;
  authMethods: OAuthAuthMethod[];
  onClose: () => void;
  onSendMagicLink: (email: string) => Promise<void>;
  onSignInWithProvider: (
    providerId: string,
    provider: OAuthAuthMethod["provider"],
    scopes: string,
  ) => Promise<void>;
};

export function AuthDialog({
  isOpen,
  isConfigured,
  isSendingMagicLink,
  pendingAuthProviderId,
  message,
  authMethods,
  onClose,
  onSendMagicLink,
  onSignInWithProvider,
}: AuthDialogProps) {
  const [email, setEmail] = useState("");
  const emailInputId = useId();
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSendMagicLink(email);
  };

  return (
    <div className="auth-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="auth-dialog-header">
          <div>
            <p className="auth-dialog-kicker">Аккаунт</p>
            <h2 id={titleId}>Войти в путеводитель</h2>
          </div>
          <button
            className="auth-dialog-close"
            type="button"
            onClick={onClose}
            aria-label="Закрыть вход"
          >
            x
          </button>
        </header>

        <div className="auth-dialog-methods" aria-label="Способы входа">
          {authMethods.map((method) => {
            const isPending = pendingAuthProviderId === method.id;

            return (
              <button
                className="auth-dialog-provider-button"
                type="button"
                key={method.id}
                disabled={!isConfigured || Boolean(pendingAuthProviderId)}
                onClick={() => void onSignInWithProvider(method.id, method.provider, method.scopes)}
              >
                {isPending ? "Открываем вход" : `Войти через ${method.label}`}
              </button>
            );
          })}
        </div>

        <div className="auth-dialog-divider">
          <span>или</span>
        </div>

        <form className="auth-dialog-email-form" onSubmit={handleSubmit}>
          <label htmlFor={emailInputId}>Email</label>
          <div className="auth-dialog-email-row">
            <input
              id={emailInputId}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="mail@example.com"
              disabled={!isConfigured || isSendingMagicLink}
              required
            />
            <button type="submit" disabled={!isConfigured || isSendingMagicLink}>
              {isSendingMagicLink ? "Отправляем" : "Получить ссылку"}
            </button>
          </div>
        </form>

        {message ? <p className="auth-dialog-message">{message}</p> : null}
      </section>
    </div>
  );
}
