import { AVATARS, type AvatarOption } from "@/contexts/UserContext";

interface AvatarPickerProps {
  selected: AvatarOption;
  onSelect: (avatar: AvatarOption) => void;
  onClose: () => void;
}

const AvatarPicker = ({ selected, onSelect, onClose }: AvatarPickerProps) => {
  return (
    <div className="travel-card animate-scale-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Choose Your Avatar</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:bg-secondary/80"
        >
          ✕
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Pick a sticker that represents you!
      </p>
      <div className="grid grid-cols-6 gap-3">
        {AVATARS.map((avatar) => (
          <button
            key={avatar}
            onClick={() => {
              onSelect(avatar);
              onClose();
            }}
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-200 ${
              selected === avatar
                ? "bg-primary/20 ring-2 ring-primary scale-110 shadow-md"
                : "bg-secondary hover:bg-secondary/80 hover:scale-105"
            }`}
          >
            {avatar}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AvatarPicker;
