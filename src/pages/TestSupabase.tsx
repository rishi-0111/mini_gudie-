import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const TestSupabase = () => {
    const [status, setStatus] = useState<any>({});

    useEffect(() => {
        const checkSupabase = async () => {
            try {
                // Check Supabase connection
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                // Try to get auth settings
                const response = await fetch(
                    `https://ffqfsjpgsnymebmrsniu.supabase.co/auth/v1/settings`,
                    {
                        headers: {
                            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                        }
                    }
                );

                const settings = await response.json();

                setStatus({
                    connected: true,
                    session: session ? 'Active' : 'None',
                    settings: settings,
                    url: import.meta.env.VITE_SUPABASE_URL,
                    key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.substring(0, 20) + '...',
                });
            } catch (error: any) {
                setStatus({
                    connected: false,
                    error: error.message,
                });
            }
        };

        checkSupabase();
    }, []);

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>

                <div className="bg-card p-6 rounded-lg border">
                    <h2 className="text-lg font-semibold mb-4">Status:</h2>
                    <pre className="bg-muted p-4 rounded text-sm overflow-auto">
                        {JSON.stringify(status, null, 2)}
                    </pre>
                </div>

                <div className="mt-6 bg-card p-6 rounded-lg border">
                    <h2 className="text-lg font-semibold mb-4">Test Google Sign-In:</h2>
                    <button
                        onClick={async () => {
                            try {
                                const { data, error } = await supabase.auth.signInWithOAuth({
                                    provider: 'google',
                                    options: {
                                        redirectTo: `${window.location.origin}/auth/callback`,
                                    },
                                });

                                if (error) {
                                    alert('Error: ' + JSON.stringify(error));
                                } else {
                                    alert('Success! Redirecting...');
                                }
                            } catch (err: any) {
                                alert('Exception: ' + err.message);
                            }
                        }}
                        className="btn-primary"
                    >
                        Test Google OAuth
                    </button>
                </div>

                <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h2 className="text-lg font-semibold mb-2">Instructions:</h2>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>Check the status above to see if Supabase is connected</li>
                        <li>Look at the "settings" object to see enabled providers</li>
                        <li>Click "Test Google OAuth" to see the exact error</li>
                        <li>Share the results with me</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

export default TestSupabase;
