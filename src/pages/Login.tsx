import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Phone, Lock, ArrowRight, Loader2, Eye, EyeOff, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { signInWithPassword, signInWithPhoneOTP, verifyOTP, signInWithGoogle } from "@/integrations/supabase/auth";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    mobile: "",
    password: "",
  });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === "otp" && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [step]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordLogin = async () => {
    // Validation
    if (!formData.mobile || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please enter both mobile number and password",
        variant: "destructive",
      });
      return;
    }

    if (formData.mobile.length !== 10) {
      toast({
        title: "Invalid Mobile Number",
        description: "Please enter a valid 10-digit mobile number",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const email = `${formData.mobile}@example.com`;

      const { user, error } = await signInWithPassword({
        email,
        password: formData.password,
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message || "Invalid credentials. Please check your mobile number and password.",
          variant: "destructive",
        });
        return;
      }

      if (user) {
        // Handle remember me
        if (rememberMe) {
          localStorage.setItem("rememberMe", "true");
          localStorage.setItem("savedMobile", formData.mobile);
        } else {
          localStorage.removeItem("rememberMe");
          localStorage.removeItem("savedMobile");
        }

        toast({
          title: "Login Successful!",
          description: "Welcome back to Mini Gudie",
        });
        navigate("/home");
      }
    } catch (error: any) {
      toast({
        title: "Unexpected Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!formData.mobile || formData.mobile.length !== 10) {
      toast({
        title: "Invalid Mobile Number",
        description: "Please enter a valid 10-digit mobile number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const phoneNumber = `+91${formData.mobile}`;
      const { error } = await signInWithPhoneOTP(phoneNumber);

      if (error) {
        toast({
          title: "OTP Sending Failed",
          description: error.message || "Could not send OTP. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setStep("otp");
      toast({
        title: "OTP Sent!",
        description: "Please check your mobile for the verification code",
      });
    } catch (error: any) {
      toast({
        title: "Unexpected Error",
        description: error.message || "Something went wrong",
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
      const { user, error } = await verifyOTP(phoneNumber, otpValue, "sms");

      if (error) {
        toast({
          title: "Verification Failed",
          description: error.message || "Invalid OTP. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (user) {
        // Handle remember me
        if (rememberMe) {
          localStorage.setItem("rememberMe", "true");
          localStorage.setItem("savedMobile", formData.mobile);
        }

        toast({
          title: "Login Successful!",
          description: "Welcome back to Mini Gudie",
        });
        navigate("/home");
      }
    } catch (error: any) {
      toast({
        title: "Unexpected Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setOtp(["", "", "", "", "", ""]);
    await handleSendOTP();
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle();

      if (error) {
        toast({
          title: "Google Sign-In Failed",
          description: error.message || "Could not sign in with Google",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Redirecting to Google",
        description: "Please wait...",
      });
    } catch (error: any) {
      toast({
        title: "Unexpected Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (loginMethod === "password") {
        handlePasswordLogin();
      } else {
        handleSendOTP();
      }
    }
  };

  // Load saved mobile if remember me was checked
  useEffect(() => {
    const savedRememberMe = localStorage.getItem("rememberMe");
    const savedMobile = localStorage.getItem("savedMobile");
    if (savedRememberMe === "true" && savedMobile) {
      setRememberMe(true);
      setFormData((prev) => ({ ...prev, mobile: savedMobile }));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
      {/* Centered Card Container */}
      <div className="w-full max-w-md">
        {/* Header Card */}
        <div className="bg-gradient-hero px-8 py-10 rounded-t-3xl shadow-lg">
          <div className="animate-fade-in-down text-center">
            <h1 className="text-3xl font-bold text-primary-foreground">
              Welcome Back 👋
            </h1>
            <p className="text-primary-foreground/80 mt-2">
              Login to continue your journey
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white px-8 py-8 rounded-b-3xl shadow-xl">
          <div className="animate-fade-in-up">
            {step === "credentials" ? (
              <div className="space-y-5">
                {/* Login Method Toggle */}
                <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  <button
                    onClick={() => setLoginMethod("password")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${loginMethod === "password"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Password
                  </button>
                  <button
                    onClick={() => setLoginMethod("otp")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${loginMethod === "otp"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    OTP
                  </button>
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
                      onKeyPress={handleKeyPress}
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                      className="input-travel pl-12"
                    />
                  </div>
                </div>

                {/* Password Input (shown only for password login) */}
                {loginMethod === "password" && (
                  <>
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
                          onKeyPress={handleKeyPress}
                          placeholder="Enter your password"
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

                    {/* Forgot Password Link */}
                    <div className="text-right">
                      <Link
                        to="/forgot-password"
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot Password?
                      </Link>
                    </div>
                  </>
                )}

                {/* Remember Me Checkbox */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label
                    htmlFor="rememberMe"
                    className="text-sm text-foreground/80 cursor-pointer"
                  >
                    Remember me
                  </label>
                </div>

                {/* Login Button */}
                <button
                  onClick={loginMethod === "password" ? handlePasswordLogin : handleSendOTP}
                  disabled={isLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {loginMethod === "password" ? "Login" : "Send OTP"}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

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
                  Sign in with Google
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* OTP Header */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Verify OTP</h2>
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
                <button
                  onClick={handleVerifyOTP}
                  disabled={isLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Verify & Login
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Back Button */}
                <button
                  onClick={() => setStep("credentials")}
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
              Don't have an account?{" "}
              <Link to="/signup" className="link-primary">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
