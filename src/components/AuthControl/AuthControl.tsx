import { useId, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import "./AuthControl.css";

type AuthControlProps = {
  user: User | null;
  isConfigured: boolean;
  isOpen: boolean;
  isSendingMagicLink: boolean;
  message: string | null;
  onOpenChange: (isOpen: boolean) => void;
  onSendMagicLink: (email: string) => Promise<void>;
  onSignOut: () => Promise<void>;
};

export function AuthControl({
  user,
  isConfigured,
  isOpen,
  isSendingMagicLink,
  message,
  onOpenChange,
  onSendMagicLink,
  onSignOut,
}: AuthControlProps) {
  const [email, setEmail] = useState("");
  const emailInputId = useId();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSendMagicLink(email);
  };

  if (user) {
    return (
      <div className="auth-control auth-control--signed-in">
        <span className="auth-control-user" title={user.email ?? undefined}>
          {user.email ?? "Аккаунт"}
        </span>
        <button className="auth-control-button" type="button" onClick={() => void onSignOut()}>
          Выйти
        </button>
      </div>
    );
  }

  return (
    <div className={`auth-control${isOpen ? " auth-control--open" : ""}`}>
      {isOpen ? (
        <form className="auth-control-form" onSubmit={handleSubmit}>
          <label className="auth-control-label" htmlFor={emailInputId}>
            Email
          </label>
          <input
            id={emailInputId}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="mail@example.com"
            disabled={!isConfigured || isSendingMagicLink}
            required
          />
          <button
            className="auth-control-button"
            type="submit"
            disabled={!isConfigured || isSendingMagicLink}
          >
            {isSendingMagicLink ? "Отправляем" : "Войти"}
          </button>
          <button
            className="auth-control-close"
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Скрыть вход"
          >
            x
          </button>
          {message ? <p className="auth-control-message">{message}</p> : null}
        </form>
      ) : (
        <button className="auth-control-button" type="button" onClick={() => onOpenChange(true)}>
          Войти
        </button>
      )}
    </div>
  );
}
