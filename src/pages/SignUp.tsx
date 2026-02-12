import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import gsap from "gsap";
import { User, Phone, Shield, ArrowRight, Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { signInWithPhoneOTP, verifyOTP, signInWithGoogle, signUpWithEmail } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { ThreeScene, LazyGlobeScene } from "@/components/three/LazyThreeScenes";
import MagneticButton from "@/components/MagneticButton";
import logo from "@/assets/logo.png";

const SignUp = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // GSAP refs
  const pageRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const headerCardRef = useRef<HTMLDivElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);

  // GSAP matchMedia — respects prefers-reduced-motion
  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add(
      {
        reduceMotion: "(prefers-reduced-motion: reduce)",
        normal: "(prefers-reduced-motion: no-preference)",
      },
      (context) => {
        const { reduceMotion } = context.conditions!;

        // Logo spin + bounce
        gsap.fromTo(
          logoRef.current,
          { opacity: 0, scale: 0, rotation: reduceMotion ? 0 : -180 },
          {
            opacity: 1,
            scale: 1,
            rotation: 0,
            duration: reduceMotion ? 0.3 : 0.9,
            delay: 0.2,
            ease: reduceMotion ? "power1.out" : "back.out(1.7)",
          }
        );

        // Header card slide
        gsap.fromTo(
          headerCardRef.current,
          { y: reduceMotion ? 0 : -40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: reduceMotion ? 0.2 : 0.7,
            delay: reduceMotion ? 0 : 0.3,
            ease: "power3.out",
          }
        );

        // Form card slide up
        gsap.fromTo(
          formCardRef.current,
          { y: reduceMotion ? 0 : 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: reduceMotion ? 0.2 : 0.7,
            delay: reduceMotion ? 0 : 0.5,
            ease: "power3.out",
          }
        );

        // Continuous logo float — skip if reduced motion
        if (!reduceMotion) {
          gsap.to(logoRef.current, {
            y: -6,
            duration: 2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: 1.2,
          });
        }
      }
    );

    return () => mm.revert();
  }, []);

  // Auto-focus first OTP input when entering OTP step
  useEffect(() => {
    if (step === "otp" && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [step]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignUp = async () => {
    // Validation
    if (!formData.username || !formData.mobile || !formData.password || !formData.confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.mobile.length < 10) {
      toast({
        title: "Invalid Mobile Number",
        description: "Please enter a valid 10-digit mobile number",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are identical",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Use example.com domain which is universally accepted for testing
      // This is a reserved domain that won't trigger validation errors
      const email = `${formData.mobile}@example.com`;

      const { user, error: signUpError } = await signUpWithEmail({
        email,
        password: formData.password,
        fullName: formData.username,
        phoneNumber: `+91${formData.mobile}`,
      });

      if (signUpError) {
        // Check if it's an email validation error
        if (signUpError.message?.includes('invalid') || signUpError.message?.includes('email')) {
          toast({
            title: "Registration Error",
            description: "Please make sure email confirmation is disabled in Supabase settings. Go to Authentication → Settings → Email Auth and disable 'Confirm email'.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Registration Failed",
            description: signUpError.message || "Failed to create account. Please try again.",
            variant: "destructive",
          });
        }
        setIsLoading(false);
        return;
      }

      // Now send OTP for mobile verification
      const phoneNumber = `+91${formData.mobile}`;
      const { error: otpError } = await signInWithPhoneOTP(phoneNumber);

      if (otpError) {
        toast({
          title: "OTP Sending Failed",
          description: "Account created but couldn't send OTP. You can login with your password.",
          variant: "destructive",
        });
        setIsLoading(false);
        // Still allow them to proceed
        setTimeout(() => navigate("/home"), 2000);
        return;
      }

      setStep("otp");
      toast({
        title: "Account Created!",
        description: "Please verify your mobile number with the OTP sent.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the complete 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const phoneNumber = `+91${formData.mobile}`;

      const { user, error } = await verifyOTP(phoneNumber, otpValue, 'sms');

      if (error) {
        toast({
          title: "Verification Failed",
          description: error.message || "Invalid OTP. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (user) {
        // Update user profile with username
        // @ts-ignore - Types will be generated after schema is applied
        await supabase
          .from('users_profile')
          .update({ full_name: formData.username })
          .eq('id', user.id);

        toast({
          title: "Registration Successful!",
          description: `Welcome to Mini Gudie, ${formData.username}!`,
        });

        // Navigate to home after successful registration
        setTimeout(() => navigate("/home"), 1000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    try {
      const phoneNumber = `+91${formData.mobile}`;
      const { error } = await signInWithPhoneOTP(phoneNumber);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to resend OTP. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "OTP Resent!",
          description: "Please check your mobile for the new verification code",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle();

      if (error) {
        toast({
          title: "Google Sign-In Failed",
          description: error.message || "Failed to sign in with Google",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Google Sign-In",
        description: "Redirecting to Google...",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div ref={pageRef} className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Three.js Globe Background */}
      <div className="absolute inset-0 opacity-[0.07]">
        <ThreeScene className="absolute inset-0">
          <LazyGlobeScene />
        </ThreeScene>
      </div>

      {/* Logo — top-right corner */}
      <div className="absolute top-6 right-6 z-20">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150" />
          <img
            ref={logoRef}
            src={logo}
            alt="Mini Guide Logo"
            className="w-16 h-16 object-cover relative z-10 rounded-full border-[3px] border-white/30 shadow-lg opacity-0"
          />
        </div>
      </div>

      {/* Centered Card Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Header Card */}
        <div ref={headerCardRef} className="bg-gradient-hero px-8 py-8 rounded-t-3xl shadow-lg opacity-0">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary-foreground">
              Create Account
            </h1>
            <p className="text-primary-foreground/80 mt-2">
              Start your journey with Mini Guide
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div ref={formCardRef} className="bg-white px-8 py-8 rounded-b-3xl shadow-xl opacity-0">
          <div>
            {step === "details" ? (
              <div className="space-y-5">
                {/* Username Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Enter your username"
                      className="input-travel pl-12"
                    />
                  </div>
                </div>

                {/* Mobile Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleInputChange}
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                      className="input-travel pl-12"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll send an OTP to verify your number
                  </p>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Create a password (min 6 characters)"
                      className="input-travel pl-12 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm your password"
                      className="input-travel pl-12"
                    />
                  </div>
                </div>

                {/* Sign Up Button */}
                <MagneticButton
                  onClick={handleSignUp}
                  disabled={isLoading}
                  className="w-full mt-6"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </MagneticButton>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-card text-muted-foreground">
                      or continue with
                    </span>
                  </div>
                </div>

                {/* Google Sign In */}
                <button
                  onClick={handleGoogleSignIn}
                  className="btn-secondary w-full flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign up with Google
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* OTP Header */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Verify Mobile Number</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Enter the 6-digit code sent to +91 {formData.mobile}
                  </p>
                </div>

                {/* OTP Input Boxes */}
                <div className="flex justify-center gap-3 my-8">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOTPChange(index, e.target.value)}
                      onKeyDown={(e) => handleOTPKeyDown(index, e)}
                      className="otp-input"
                    />
                  ))}
                </div>

                {/* Resend OTP */}
                <div className="text-center">
                  <button
                    onClick={handleResendOTP}
                    disabled={isLoading}
                    className="text-sm text-primary hover:underline disabled:opacity-50"
                  >
                    Resend OTP
                  </button>
                </div>

                {/* Verify Button */}
                <MagneticButton
                  onClick={handleVerifyOTP}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Verify & Complete Registration
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </MagneticButton>

                {/* Back Button */}
                <button
                  onClick={() => setStep("details")}
                  className="btn-secondary w-full mt-2"
                >
                  Back
                </button>
              </div>
            )}
          </div>

          {/* Footer Links */}
          <div className="text-center mt-6 space-y-3">
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="link-primary">
                Login
              </Link>
            </p>
            <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary">
              Forgotten password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
