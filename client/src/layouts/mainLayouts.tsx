import React, { useState } from "react";
import Footer from "@/components/footer";
import { useTheme } from "@/components/theme-provider";
import {
  Moon,
  Sun,
  Database,
  LogOut,
  User,
  Menu,
  X,
} from "lucide-react";
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

  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <BetaPromoBanner />

      {/* NAVBAR */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">

            {/* Logo */}
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
                <Database className="w-5 h-5 text-primary-foreground" />
              </div>
              <a href="/">
                <h1 className="text-lg font-semibold text-foreground">
                  DataPurify
                </h1>
              </a>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="/#features-section">
                <Button variant="ghost">Features</Button>
              </a>
              <a href="/#testimonials-section">
                <Button variant="ghost">Testimonials</Button>
              </a>
              <a href="/#footer">
                <Button variant="ghost">Contact Us</Button>
              </a>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">

              {/* Theme Toggle (desktop) */}
              <div className="hidden sm:flex items-center gap-2">
                <Sun className="h-4 w-4" />
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={toggleTheme}
                />
                <Moon className="h-4 w-4" />
              </div>

              {/* Desktop Auth / CTA */}
              <div className="hidden md:flex">
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-10 h-10 rounded-full bg-[#8668FD] text-white flex items-center justify-center">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-52 mt-2">
                      <DropdownMenuLabel>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {displayName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {plan === "pro" ? "Pro Plan" : "Free Plan"}
                          </span>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={logout}
                        className="cursor-pointer text-red-600"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    className="bg-[#8668FD] text-white px-5 rounded-full hover:bg-[#9b82ff]"
                    onClick={() =>
                      document
                        .getElementById("waitlist")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    Join Waitlist
                  </Button>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setOpen(!open)}
                className="md:hidden w-10 h-10 rounded-lg border border-border flex items-center justify-center"
              >
                {open ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {open && (
            <div className="md:hidden pt-4 pb-6 space-y-4">
              <a
                href="/#features-section"
                className="block text-base text-foreground"
                onClick={() => setOpen(false)}
              >
                Features
              </a>
              <a
                href="/#testimonials-section"
                className="block text-base text-foreground"
                onClick={() => setOpen(false)}
              >
                Testimonials
              </a>
              <a
                href="/#footer"
                className="block text-base text-foreground"
                onClick={() => setOpen(false)}
              >
                Contact Us
              </a>

              {/* Theme Toggle (mobile) */}
              <div className="flex items-center gap-2 pt-2">
                <Sun className="h-4 w-4" />
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={toggleTheme}
                />
                <Moon className="h-4 w-4" />
              </div>

              {/* Mobile CTA */}
              {!user && (
                <Button
                  className="w-full bg-[#8668FD] text-white rounded-xl py-3"
                  onClick={() =>
                    document
                      .getElementById("waitlist")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Join Waitlist
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* AUTH MODAL */}
      {showAuthModal && !user && (
        <AuthForm onClose={() => setShowAuthModal(false)} />
      )}

      <main className="flex-1">{children}</main>

      <Footer />
    </div>
  );
}