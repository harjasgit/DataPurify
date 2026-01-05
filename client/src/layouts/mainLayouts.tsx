import React from "react";
import Footer from "@/components/footer";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun, Database, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import AuthForm from "@/components/authForm";
import BetaPromoBanner from "@/components/promoBeta";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useUser } from "@/context/userContext";

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { theme, toggleTheme } = useTheme();
  const {
    user,
    displayName,
    avatarUrl,
    plan,
    showAuthModal,
    setShowAuthModal,
    logout,
  } = useUser();

  
  return (
    <div className="min-h-screen flex flex-col bg-background">
        <BetaPromoBanner />
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
                <Database className="w-5 h-5 text-primary-foreground" />
              </div>
              <a href="/">
                <h1 className="text-xl font-semibold text-foreground">
                  DataPurify
                </h1>
              </a>
            </div>

            {/* Desktop Nav */}
            { <div className="hidden md:flex space-x-8">
              <a href="/#pricing-section">
                <Button variant="ghost">Features</Button>
              </a>
              <a href="/#features-section">
              <Button variant="ghost">Testimonials</Button>
              </a>
              <a href="/#contact-section">
              <Button variant="ghost">Contact Us</Button>
            </a>
            </div> }

            {/* Right Section */}
            <div className="flex items-center space-x-6">
              {/* Theme Switch */}
              <div className="flex items-center space-x-2">
                <Sun className="h-4 w-4" />
                <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
                <Moon className="h-4 w-4" />
              </div>

              {/* AUTH */}
             {user ? (
         <div className="flex items-center space-x-4">
    
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[#8668FD] text-white">
          {avatarUrl ? (
            <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <User className="w-5 h-5" />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52 mt-2">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium">{displayName}</span>
            <span className="text-xs text-muted-foreground">
              {plan === "pro" ? "Pro Plan" : "Free Plan"}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
) : (
  // <div className="flex items-center space-x-3">
  //   <Button className="bg-[#8668FD] text-white" onClick={() => setShowAuthModal(true)}>
  //     Login
  //   </Button>
  //   <Button variant="outline" className="border-[#8668FD] text-[#8668FD]" onClick={() => setShowAuthModal(true)}>
  //     Sign Up
  //   </Button>
  // </div>

  <Button
    className="bg-[#8668FD] text-white px-5 rounded-full hover:bg-[#9b82ff] transition"
    onClick={() => (window.location.href = "/waitlist")}
  >
    Join Waitlist
  </Button>

)}

 </div>
          </div>
        </div>
      </header>

      {showAuthModal && !user && (
        <AuthForm onClose={() => setShowAuthModal(false)} />
      )}

      <main className="flex-1">{children}</main>

      <Footer />
    </div>
  );
};
