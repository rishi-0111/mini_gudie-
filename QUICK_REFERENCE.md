# 🚀 Quick Reference - New Features & Components

## 📦 How to Use New Components

### 1. Animated Backgrounds

#### ParticleSystemBackground (Currently Active)
```tsx
import { ParticleSystemBackground } from "@/components/ParticleSystemBackground";

// In your component/page:
<ParticleSystemBackground 
  particleCount={30}           // Number of particles (default: 50)
  particleSize={2}             // Size in pixels (default: 2)
  particleSpeed={0.5}          // Movement speed (default: 0.5)
  interactive={true}           // Respond to mouse? (default: true)
  className="opacity-50"       // Optional Tailwind classes
/>
```

#### Animated3DBackground
```tsx
import { Animated3DBackground } from "@/components/Animated3DBackground";

<Animated3DBackground 
  intensity={0.5}              // Light intensity (0-1)
  speed={1}                    // Animation speed
  className="opacity-30"
/>
```

#### AnimatedGradientBackground
```tsx
import { AnimatedGradientBackground } from "@/components/AnimatedGradientBackground";

<AnimatedGradientBackground 
  duration={15}                // Cycle duration in seconds
  pauseOnHover={true}          // Pause on mouse hover?
  className="fixed inset-0 -z-10"
/>
```

#### AnimatedBlobBackground
```tsx
import { AnimatedBlobBackground } from "@/components/AnimatedBlobBackground";

<AnimatedBlobBackground 
  colors={["#7c3aed", "#a78bfa", "#e879f9"]}
  speed={1}
/>
```

---

## 🎨 Dark Mode Neon Text Colors

### Using Neon Colors in Dark Mode

```tsx
// Neon text with glow effect (dark mode only)
<h1 className="dark:text-neon-white dark:text-shadow">
  Welcome to Mini Gudie
</h1>

<p className="dark:text-neon-cyan">Explore amazing places</p>
<p className="dark:text-neon-pink">Find hidden gems</p>
<p className="dark:text-neon-purple">Plan your travel</p>
<p className="dark:text-neon-green">Stay safe & connected</p>
<p className="dark:text-neon-yellow">Discover adventures</p>
```

### Available Neon Colors
```css
/* Text Colors (with glow) */
text-neon-white      /* 95% brightness white */
text-neon-cyan       /* Bright cyan */
text-neon-purple     /* Vibrant purple */
text-neon-pink       /* Hot pink */
text-neon-green      /* Bright green */
text-neon-yellow     /* Bright yellow */

/* Shadow Effects */
shadow-neon-purple   /* Purple glow */
shadow-neon-pink     /* Pink glow */
shadow-neon-cyan     /* Cyan glow */
```

---

## ⚡ New Animation Classes

### Scroll-Triggered Animations
```tsx
<div className="scroll-fade-in">Fades in on scroll</div>
<div className="scroll-slide-up">Slides up on scroll</div>
<div className="scroll-scale-in">Scales in on scroll</div>
```

### Entrance Animations
```tsx
<div className="animate-fade-in">Fades in (0.5s)</div>
<div className="animate-slide-in-from-left">From left</div>
<div className="animate-slide-in-from-right">From right</div>
<div className="animate-slide-in-from-top">From top</div>
<div className="animate-slide-in-from-bottom">From bottom</div>
<div className="animate-scale-in">Scales in</div>
<div className="animate-bounce-in">Bounces in</div>
```

### Continuous Animations
```tsx
<div className="float-animation">Floats up and down (6s)</div>
<div className="animate-pulse-neon">Pulses (2s)</div>
<div className="wiggle">Wiggles (0.5s)</div>
<div className="heartbeat">Heartbeat pulse (1.3s)</div>
```

### Timing Functions
```tsx
className="transition-colors duration-300 ease-bounce-in"
className="transition-all duration-350 ease-smooth-ease"
className="transition-transform duration-450 ease-spring"
```

---

## 📱 Profile Updates

### Saving Profile to Supabase
```tsx
// In Profile.tsx - automatically syncs to DB
const handleSaveProfile = async () => {
  // Updates Supabase users_profile table
  // Columns: full_name, phone_number
  const { error } = await updateUserProfile({
    fullName: editForm.name,
    phoneNumber: editForm.phone,
  });
  
  if (error) {
    toast({ title: "Error", description: error.message });
  }
};
```

### Emergency Contacts
```tsx
// Stored in JSONB column: emergency_contacts
const contact = {
  id: "1",
  name: "Mom",
  phone: "+91 98765 00001",
  relation: "Mother",
  isPrimary: true,
};
// Automatically saved to Supabase on add/delete/update
```

---

## 🔐 Login - Remember Me

### How It Works
```tsx
// Automatically loads saved mobile on page load
useEffect(() => {
  const savedMobile = localStorage.getItem("savedMobile");
  if (savedMobile) {
    setFormData(prev => ({ ...prev, mobile: savedMobile }));
  }
}, []);

// Saves when user checks "Remember me" and logs in
if (rememberMe) {
  localStorage.setItem("rememberMe", "true");
  localStorage.setItem("savedMobile", formData.mobile);
}
```

---

## 🎨 Enhanced Tailwind Utilities

### Glass Effect
```tsx
<div className="glass-effect rounded-2xl p-4">
  {/* Frosted glass with blur */}
</div>
```

### Text Utilities
```tsx
<h1 className="text-gradient-purple text-3xl font-bold">
  Gradient Text
</h1>

<p className="text-responsive">Responsive font size</p>
<p className="text-heading-responsive text-xl">Responsive heading</p>
<p className="text-line-clamp-2">Clamps to 2 lines...</p>
```

### Interactive Elements
```tsx
<button className="interactive hover-lift">
  Clicks scale down, hovers lift up
</button>
```

### Border Effects
```tsx
<div className="border-glow border-primary rounded-lg">
  Glowing border
</div>
```

### Spacing with Safe Areas
```tsx
<div className="pb-safe">
  {/* Respects notch/home bar on mobile */}
</div>
```

---

## 🔧 Configuration Options

### ParticleSystemBackground
```typescript
interface ParticleSystemProps {
  particleCount?: number;      // 50 default
  particleSize?: number;       // 2 default
  particleSpeed?: number;      // 0.5 default
  interactive?: boolean;       // true default
  className?: string;
}
```

### Animated3DBackground
```typescript
interface Animated3DBackgroundProps {
  intensity?: number;          // 0-1, default: 0.5
  speed?: number;              // 1 default
  className?: string;
}
```

### AnimatedGradientBackground
```typescript
interface AnimatedGradientProps {
  duration?: number;           // 15 default (seconds)
  pauseOnHover?: boolean;      // false default
  className?: string;
}
```

---

## 📊 Performance Tips

1. **Reduce Particle Count on Mobile:**
   ```tsx
   const isMobile = window.innerWidth < 768;
   <ParticleSystemBackground 
     particleCount={isMobile ? 15 : 30}
   />
   ```

2. **Disable Animations if Reduced Motion:**
   ```tsx
   const prefersReduced = window.matchMedia(
     "(prefers-reduced-motion: reduce)"
   ).matches;
   ```

3. **Lazy Load Backgrounds:**
   ```tsx
   const AnimatedBackground = lazy(() => 
     import("@/components/ParticleSystemBackground")
   );
   ```

---

## 🎯 Common Use Cases

### Landing Page
```tsx
<ParticleSystemBackground 
  particleCount={40} 
  interactive={true}
/>
<AnimatedGradientBackground />
```

### Dark Mode Dashboard
```tsx
<div className="dark">
  <h1 className="text-neon-white text-3xl">Dashboard</h1>
  <AnimatedBlobBackground colors={["#7c3aed"]} />
</div>
```

### Profile Page (With Supabase)
```tsx
<Profile />
{/* Mobile number saves automatically */}
{/* Emergency contacts sync to DB */}
```

### Login Page (With Remember Me)
```tsx
<Login />
{/* Mobile pre-fills if "Remember me" was checked */}
{/* Updates localStorage on successful login */}
```

---

## 🐛 Troubleshooting

### Background not showing?
- Check z-index: background should be `-z-10`
- Ensure `pointer-events: none` is set
- Verify parent container has `position: relative`

### Animations not working?
- Check browser supports CSS `animation-timeline` (Chrome 115+)
- Fallback to GSAP animations for older browsers
- Check `prefers-reduced-motion` isn't enabled

### Neon colors not visible?
- Only visible in dark mode (`.dark` class)
- Check dark mode is enabled in Tailwind config
- Text needs `text-neon-*` class explicitly

### Particle performance issue?
- Reduce `particleCount` (target 30-50)
- Disable `interactive` mode on mobile
- Use `particleSpeed={0.2}` for lighter effect

---

## 📚 Documentation References

- **Three.js:** https://threejs.org/docs/
- **GSAP:** https://gsap.com/docs/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Supabase:** https://supabase.com/docs

---

**Last Updated:** February 20, 2026  
**Version:** 1.0  
**Status:** Production Ready ✅
