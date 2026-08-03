import { useEffect, cloneElement, isValidElement } from 'react';
import './Modal.scss';
import { useScale } from '../Scale';

function Modal({ child, requestClose, className = '', scaleDisabled = false, backdrop = false, backdropClass = '', closing = false }: any) {
  const keyPress = (e: KeyboardEvent) => {
    if (requestClose && e.key === 'Escape') requestClose();
  }

  useEffect(() => {
    if (requestClose) {
      document.addEventListener('keydown', keyPress);
      return () => document.removeEventListener('keydown', keyPress);
    }
  });

  const scale = useScale(true);

  const renderedChild = (isValidElement(child) && (child as any).props?.onSuccess && requestClose)
    ? cloneElement(child as any, { onSuccess: requestClose })
    : child;

  return (
    <>
      {backdrop && (
        <div
          className={`modal-backdrop ${backdropClass} ${closing ? 'modal-backdrop-closing' : ''}`}
          onClick={requestClose}
        />
      )}
      <div className={`modal ${className} ${closing ? 'modal-closing' : ''}`} style={scaleDisabled ? {} : scale.styles}>
        {renderedChild}
        {requestClose && <button className="modal-close" aria-label="Close" onClick={requestClose}>
          <span className="modal-close-x" />
        </button>}
      </div>
    </>
  )
}

export default Modal;
