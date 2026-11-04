import { useRef, useEffect, useId } from "react";
import "./Modal.css";

// Modal genérico com fundo escuro, fechamento por ESC e clique no overlay
export default function Modal({ isOpen, title, children, onClose, dialogLabel }) {
  const modalRef = useRef(null);
  const titleId = useId();
  const accessible = Boolean(dialogLabel);
  useEffect(() => {
    if (!isOpen || !accessible) return;
    const previous = document.activeElement;
    modalRef.current?.querySelector("button")?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, [isOpen, accessible]);

  function trapFocus(event) {
    if (!accessible || event.key !== "Tab") return;
    const nodes = [...modalRef.current.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')];
    if (!nodes.length) { event.preventDefault(); return; }
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={accessible ? "modal record-details-dialog" : "modal"} ref={modalRef} role={accessible ? "dialog" : undefined} aria-modal={accessible ? true : undefined} aria-labelledby={accessible ? titleId : undefined} onKeyDown={trapFocus} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id={accessible ? titleId : undefined}>{title}</h2>
          <button type="button" className="close-btn" aria-label={accessible ? "Fechar detalhes" : undefined} onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
}
