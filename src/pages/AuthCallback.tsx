import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Handle the OAuth callback
        const handleCallback = async () => {
            try {
                // Get the session from the URL hash
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error("Auth callback error:", error);
                    navigate("/login?error=auth_failed");
                    return;
                }

                if (session) {
                    // Successfully authenticated
                    console.log("User authenticated:", session.user);

                    // Check if user profile exists, if not create it
                    // @ts-ignore - Types will be generated after schema is applied
                    const { data: profile } = await supabase
                        .from('users_profile')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (!profile) {
                        // Create user profile for Google sign-in users
                        // @ts-ignore - Types will be generated after schema is applied
                        await supabase
                            .from('users_profile')
                            .insert({
                                id: session.user.id,
                                full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                                profile_picture_url: session.user.user_metadata?.avatar_url,
                            });
                    }

                    // Redirect to home page
                    navigate("/home");
                } else {
                    // No session found
                    navigate("/login");
                }
            } catch (error) {
                console.error("Unexpected error in auth callback:", error);
                navigate("/login?error=unexpected");
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                <h2 className="text-xl font-semibold text-foreground">
                    Completing sign in...
                </h2>
                <p className="text-muted-foreground">
                    Please wait while we redirect you
                </p>
            </div>
        </div>
    );
};

export default AuthCallback;
