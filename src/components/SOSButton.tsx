import { useState } from "react";
import { Phone, X, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SOSButton = () => {
  const { toast } = useToast();
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
      title: "🚨 SOS Alert Sent!",
      description: "Emergency services and your contacts have been notified with your location.",
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
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-success flex items-center justify-center animate-scale-in">
          <CheckCircle className="w-12 h-12 text-success-foreground" />
        </div>
        <p className="text-center mt-3 text-success font-medium">Alert Sent!</p>
      </div>
    );
  }

  if (isConfirming) {
    return (
      <div className="travel-card p-6 animate-scale-in max-w-sm w-full">
        <div className="text-center">
          <div className="w-20 h-20 sos-button sos-pulse mx-auto mb-4">
            <Phone className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-destructive mb-2">
            Confirm Emergency SOS?
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            This will send your live location to emergency services and your registered contacts.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 btn-secondary flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              Cancel
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
                  Send SOS
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Pulse rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-28 h-28 rounded-full bg-destructive/20 animate-ping" style={{ animationDuration: "2s" }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-destructive/30 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.5s" }} />
      </div>
      
      {/* Main SOS Button */}
      <button
        onClick={handleSOSPress}
        className="relative w-24 h-24 sos-button sos-pulse"
      >
        <div className="flex flex-col items-center">
          <Phone className="w-8 h-8 mb-1" />
          <span className="text-sm font-bold">SOS</span>
        </div>
      </button>
      <p className="text-center mt-3 text-destructive font-medium text-sm">
        Tap for Emergency
      </p>
    </div>
  );
};

export default SOSButton;
