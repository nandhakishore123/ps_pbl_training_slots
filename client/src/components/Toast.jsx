import { useStore } from "../store/useStore";

export default function Toast() {
  const { state } = useStore();
  const { toast } = state;

  return (
    <>
      {/* Injecting temporary responsive utility classes */}
      <style>{`
        .responsive-toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
           Republic-scale text centering on wrap
          text-align: center; 
          z-index: 9999;
          transition: opacity 0.3s, transform 0.3s;
          pointer-events: none;
          font-family: var(--font-body);
          color: #fff;
          
          /* Desktop default settings */
          white-space: nowrap;
          max-width: 90vw;
        }

        /* Mobile Adjustments */
        @media (max-width: 480px) {
          .responsive-toast {
            bottom: 16px;
            width: calc(100% - 32px); /* Spans across mobile with 16px side margins */
            white-space: normal;      /* Allows text wrapping for long messages */
            word-break: break-word;
            padding: 14px 20px;       /* Slightly taller tap-target friendly padding */
          }
        }
      `}</style>

      <div
        className="responsive-toast"
        style={{
          opacity: toast.visible ? 1 : 0,
          // Minor enhancement: slight slide up animation when visible
          transform: toast.visible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(10px)", 
          background: toast.isError ? "#ef4444" : "#10b981",
        }}
      >
        {toast.msg}
      </div>
    </>
  );
}