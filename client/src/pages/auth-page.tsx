import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Brain, Bug, TrendingUp, Star, Shield } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);
  // Redirect after successful login/register
  useEffect(() => {
    if (loginMutation.isSuccess && user && user.id) {
      setLocation("/");
    }
  }, [loginMutation.isSuccess, user?.id, setLocation]);

  useEffect(() => {
    if (registerMutation.isSuccess && user && user.id) {
      setLocation("/");
    }
  }, [registerMutation.isSuccess, user?.id, setLocation]);

  if (user) {
    return <Redirect to="/" />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      return;
    }
    loginMutation.mutate({ email: loginEmail.trim(), password: loginPassword });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerUsername || !registerEmail || !registerPassword) {
      return;
    }
    if (registerPassword.length < 6) {
      return;
    }
    registerMutation.mutate({ 
      username: registerUsername.trim(), 
      email: registerEmail.trim().toLowerCase(), 
      password: registerPassword 
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Authentication Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 animate-slide-in-up">
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-primary/20 rounded-xl mx-auto mb-4">
              <Code className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">CodeMentor AI</h1>
            <p className="text-muted-foreground mt-2">Your AI-powered coding companion</p>
          </div>

          <Tabs defaultValue="login" className="w-full animate-scale-in">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="floating-card">
                <CardHeader>
                  <CardTitle>Welcome back</CardTitle>
                  <CardDescription>
                    Enter your credentials to continue coding
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        data-testid="input-login-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        data-testid="input-login-password"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full interactive-button ripple" 
                      disabled={loginMutation.isPending || !loginEmail || !loginPassword}
                      data-testid="button-login"
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card className="floating-card">
                <CardHeader>
                  <CardTitle>Create account</CardTitle>
                  <CardDescription>
                    Join CodeMentor AI and start improving your code
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-username">Username</Label>
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="developer123"
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(e.target.value)}
                        required
                        data-testid="input-register-username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="your@email.com"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        required
                        data-testid="input-register-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                        data-testid="input-register-password"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full interactive-button ripple" 
                      disabled={registerMutation.isPending || !registerUsername || !registerEmail || !registerPassword || registerPassword.length < 6}
                      data-testid="button-register"
                    >
                      {registerMutation.isPending ? "Creating account..." : "Create Account"}
                    </Button>
                    {registerPassword && registerPassword.length < 6 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Password must be at least 6 characters
                      </p>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Hero Section */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/20 to-accent/20 items-center justify-center p-8 animate-fade-in">
        <div className="max-w-lg text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-foreground">Debug smarter, code better</h2>
            <p className="text-xl text-muted-foreground">
              AI-powered debugging and learning platform that helps you write better code and learn faster
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Bug className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">AI Debugging</h3>
                  <p className="text-sm text-muted-foreground">Fix bugs instantly</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-chart-3/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-chart-3" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Complexity Analysis</h3>
                  <p className="text-sm text-muted-foreground">Optimize performance</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-chart-2/20 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-chart-2" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Smart Learning</h3>
                  <p className="text-sm text-muted-foreground">Personalized practice</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-chart-5/20 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-chart-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Progress Tracking</h3>
                  <p className="text-sm text-muted-foreground">Level up your skills</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card/60 backdrop-blur-sm rounded-xl p-6 space-y-4 floating-card animate-bounce-slow">
            <Shield className="w-8 h-8 text-primary mx-auto" />
            <h3 className="text-lg font-semibold text-foreground">Trusted by developers</h3>
            <p className="text-muted-foreground text-sm">
              Join thousands of developers who are improving their coding skills with AI-powered assistance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
