export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg text-center">
      <div>
        <img src="/logo-icon.png" alt="Atheris AI" className="mx-auto mb-4 h-14 w-14 rounded-full" />
        <h1 className="text-xl font-semibold">Check your inbox</h1>
        <p className="text-sm text-muted mt-2 max-w-sm">
          We&apos;ve sent a verification link to your email. Click it to activate your Atheris
          account.
        </p>
      </div>
    </div>
  );
}
