import { useEffect } from 'react';
import './Modal.scss';
import { useScale } from '../Scale';

function Modal({ child, close, className = '', scaleDisabled = false }: any) {
  const keyPress = (e: KeyboardEvent) => {
    if (close && e.key === 'Escape') close();
  }

  useEffect(() => {
    if(close) {
    document.addEventListener('keydown', keyPress);
    return () => document.removeEventListener('keydown', keyPress);
    }
  });

  const scale = useScale(true);

  return (
    <div className={`modal ${className}`} style={scaleDisabled ? {} : scale.styles}>
      {child}
      {close && <button className="modal-close" onClick={close} />}
    </div>
  )
}

export default Modal;
