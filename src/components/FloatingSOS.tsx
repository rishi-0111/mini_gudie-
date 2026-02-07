import { useState } from "react";
import { Phone, X, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const FloatingSOS = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isPressed, setIsPressed] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSOSPress = () => {
    setIsPressed(true);
    setIsConfirming(true);
  };

  const handleConfirmSOS = async () => {
    setIsSending(true);
    
    // Simulate sending SOS
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setIsSending(false);
    setIsSent(true);
    
    toast({
      title: "🚨 " + t.alertSent,
      description: t.sosDescription,
    });

    // Reset after showing success
    setTimeout(() => {
      setIsPressed(false);
      setIsConfirming(false);
      setIsSent(false);
    }, 3000);
  };

  const handleCancel = () => {
    setIsPressed(false);
    setIsConfirming(false);
  };

  if (isSent) {
    return (
      <div className="fixed right-6 bottom-28 z-50">
        <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center animate-scale-in shadow-lg">
          <CheckCircle className="w-8 h-8 text-success-foreground" />
        </div>
      </div>
    );
  }

  if (isConfirming) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="travel-card p-6 animate-scale-in max-w-sm w-full">
          <div className="text-center">
            <div className="w-20 h-20 sos-button sos-pulse mx-auto mb-4">
              <Phone className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-destructive mb-2">
              {t.confirmEmergency}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {t.sosDescription}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 btn-secondary flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                {t.cancel}
              </button>
              <button
                onClick={handleConfirmSOS}
                disabled={isSending}
                className="flex-1 sos-button py-3 px-4"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Phone className="w-5 h-5 mr-2" />
                    {t.sendSOS}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed right-6 bottom-28 z-50">
      {/* Pulse rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-destructive/20 animate-ping" style={{ animationDuration: "2s" }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-destructive/30 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.5s" }} />
      </div>
      
      {/* Main SOS Button */}
      <button
        onClick={handleSOSPress}
        className="relative w-16 h-16 sos-button sos-pulse shadow-sos"
      >
        <div className="flex flex-col items-center">
          <Phone className="w-6 h-6" />
          <span className="text-xs font-bold">{t.sos}</span>
        </div>
      </button>
    </div>
  );
};

export default FloatingSOS;
