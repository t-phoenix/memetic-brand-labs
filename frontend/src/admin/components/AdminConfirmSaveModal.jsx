export default function AdminConfirmSaveModal({
  open,
  phase = 'confirm',
  title,
  description,
  currentValue,
  nextValue,
  impact,
  errorMessage,
  busy = false,
  onConfirm,
  onCancel,
  onDismiss,
}) {
  if (!open) return null;

  const isSaving = phase === 'saving' || busy;
  const isSuccess = phase === 'success';
  const isError = phase === 'error';

  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
      <div className="admin-modal__backdrop" onClick={isSaving ? undefined : onCancel} />
      <div className="admin-modal__card">
        <h2 id="admin-modal-title" className="admin-modal__title">
          {isSuccess ? 'Saved' : isError ? 'Could not save' : 'Confirm change'}
        </h2>

        {description && <p className="admin-modal__desc">{description}</p>}

        {!isSuccess && !isError && (currentValue != null || nextValue != null) && (
          <dl className="admin-modal__diff">
            {currentValue != null && (
              <div>
                <dt>Current</dt>
                <dd>{currentValue}</dd>
              </div>
            )}
            {nextValue != null && (
              <div>
                <dt>New value</dt>
                <dd>{nextValue}</dd>
              </div>
            )}
          </dl>
        )}

        {impact && !isSuccess && !isError && (
          <p className="admin-modal__impact">{impact}</p>
        )}

        {isSaving && (
          <div className="admin-modal__status" role="status">
            <span className="admin-modal__spinner" aria-hidden="true" />
            <span>Updating backend and database…</span>
          </div>
        )}

        {isSuccess && (
          <p className="admin-modal__status admin-modal__status--success" role="status">
            {title} was updated successfully.
          </p>
        )}

        {isError && (
          <p className="admin-modal__status admin-modal__status--error" role="alert">
            {errorMessage || 'Something went wrong. Your previous setting was not changed.'}
          </p>
        )}

        <div className="admin-modal__actions">
          {isSuccess ? (
            <button type="button" className="admin-btn admin-btn--primary" onClick={onDismiss}>
              Close
            </button>
          ) : isError ? (
            <>
              <button type="button" className="admin-btn" onClick={onDismiss}>
                Close
              </button>
              <button type="button" className="admin-btn admin-btn--primary" onClick={onConfirm}>
                Try again
              </button>
            </>
          ) : (
            <>
              <button type="button" className="admin-btn" disabled={isSaving} onClick={onCancel}>
                Cancel
              </button>
              <button type="button" className="admin-btn admin-btn--primary" disabled={isSaving} onClick={onConfirm}>
                {isSaving ? 'Saving…' : 'Confirm & save'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
