import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, X, CheckCircle, Loader2 } from "lucide-react";
import gsap from "gsap";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * FloatingSOS
 * Positioned at: right-4, above the bottom nav (bottom = nav height + safe-area + extra gap).
 * z-index: 55 (below nav=60, above maps/sheets=50)
 */
const FloatingSOS = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const sosBtnRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const prefersReduced = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  // Entrance + continuous glow pulse
  useEffect(() => {
    if (!sosBtnRef.current || isConfirming || isSent) return;

    if (!prefersReduced) {
      gsap.fromTo(
        sosBtnRef.current,
        { scale: 0, rotation: -180, opacity: 0 },
        { scale: 1, rotation: 0, opacity: 1, duration: 0.7, delay: 1.2, ease: "back.out(1.7)" }
      );
      gsap.to(sosBtnRef.current, {
        boxShadow: "0 0 28px 8px hsla(0,84%,60%,0.55)",
        duration: 1.1,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 1.9,
      });
    } else {
      gsap.set(sosBtnRef.current, { scale: 1, opacity: 1 });
    }
  }, [isConfirming, isSent, prefersReduced]);

  // Modal pop-in
  useEffect(() => {
    if (isConfirming && modalRef.current && !prefersReduced) {
      gsap.fromTo(
        modalRef.current,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)" }
      );
    }
  }, [isConfirming, prefersReduced]);

  // Success check animation
  useEffect(() => {
    if (isSent && successRef.current && !prefersReduced) {
      gsap.fromTo(
        successRef.current,
        { scale: 0, rotation: -90 },
        { scale: 1, rotation: 0, duration: 0.6, ease: "back.out(2)" }
      );
    }
  }, [isSent, prefersReduced]);

  const handleSOSPress = useCallback(() => {
    if (sosBtnRef.current && !prefersReduced) {
      gsap.fromTo(sosBtnRef.current, { scale: 1.3 }, { scale: 1, duration: 0.3, ease: "power2.out" });
    }
    setIsConfirming(true);
  }, [prefersReduced]);

  const handleConfirmSOS = async () => {
    setIsSending(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSending(false);
    setIsSent(true);
    toast({ title: "🚨 " + t.alertSent, description: t.sosDescription });
    setTimeout(() => { setIsConfirming(false); setIsSent(false); }, 3000);
  };

  const handleCancel = () => setIsConfirming(false);

  // ── Success state ──
  if (isSent) {
    return (
      <div
        data-sos-btn
        className="fixed right-4 z-[55]"
        style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px) + 1rem)" }}
      >
        <div ref={successRef} className="w-14 h-14 rounded-full bg-success flex items-center justify-center shadow-lg">
          <CheckCircle className="w-7 h-7 text-success-foreground" />
        </div>
      </div>
    );
  }

  // ── Confirm modal ── (full-screen overlay, z-[70])
  if (isConfirming) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-6">
        <div ref={modalRef} className="travel-card p-6 max-w-sm w-full">
          <div className="text-center">
            <div className="w-20 h-20 sos-button sos-pulse mx-auto mb-5 flex items-center justify-center">
              <Phone className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-destructive mb-2">{t.confirmEmergency}</h3>
            <p className="text-muted-foreground text-sm mb-6">{t.sosDescription}</p>
            <div className="flex gap-3">
              <button onClick={handleCancel} className="flex-1 btn-secondary flex items-center justify-center gap-2">
                <X className="w-5 h-5" /> {t.cancel}
              </button>
              <button onClick={handleConfirmSOS} disabled={isSending} className="flex-1 sos-button py-3 px-4">
                {isSending
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <><Phone className="w-5 h-5 mr-2" />{t.sendSOS}</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Default floating button ──
  return (
    <div
      data-sos-btn
      className="fixed right-4 z-[55]"
      style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px) + 1rem)" }}
    >
      {/* Dual ping rings — decorative, respect prefers-reduced */}
      {!prefersReduced && (
        <>
          <span className="absolute inset-0 -m-2 rounded-full bg-destructive/20 animate-ping"
            style={{ animationDuration: "2s" }} />
          <span className="absolute inset-0 -m-1 rounded-full bg-destructive/25 animate-ping"
            style={{ animationDuration: "2s", animationDelay: "0.5s" }} />
        </>
      )}
      <button
        ref={sosBtnRef}
        onClick={handleSOSPress}
        aria-label="Send SOS emergency alert"
        className="relative w-14 h-14 sos-button sos-pulse shadow-sos opacity-0"
        style={prefersReduced ? { opacity: 1 } : {}}
      >
        <div className="flex flex-col items-center gap-0.5">
          <Phone className="w-5 h-5" />
          <span className="text-[10px] font-black tracking-wide">{t.sos}</span>
        </div>
      </button>
    </div>
  );
};

export default FloatingSOS;
