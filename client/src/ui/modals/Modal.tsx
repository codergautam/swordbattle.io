import { useEffect } from 'react';
import './Modal.scss';
import { useScale } from '../Scale';

function Modal({ child, close, className = '' }: any) {
  const keyPress = (e: KeyboardEvent) => {
    if (close && e.key === 'Escape') close();
  }

  useEffect(() => {
    document.addEventListener('keydown', keyPress);
    return () => document.removeEventListener('keydown', keyPress);
  });

  return (
    <div className={`modal ${className}`} style={useScale(true).styles}>
      {child}
      {close && <button className="modal-close" onClick={close} />}
    </div>
  )
}

export default Modal;
