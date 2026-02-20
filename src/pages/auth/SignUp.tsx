'use client';
import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Mail, Lock, Eye, EyeOff, Phone, Building2, CheckCircle2, XCircle } from 'lucide-react';
import { authService } from '@/lib/auth';

export function SignUp() {
  const [, setLocation] = useLocation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string, description?: string } | null>(null);

  const isFirstNameValid = firstName.trim().length >= 3;
  const isLastNameValid = lastName.trim().length >= 3;
  const isorganisationNameValid = organizationName.trim().length >= 3;
  const isPhoneValid = phoneNumber.trim().length >= 10;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPasswordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword || confirmPassword === '';

  const isFormValid =
    isFirstNameValid &&
    isLastNameValid &&
    isorganisationNameValid &&
    isPhoneValid &&
    isEmailValid &&
    isPasswordValid &&
    passwordsMatch &&
    confirmPassword.length > 0; // Ensure confirm password is filled

  const getPasswordStrength = () => {
    if (password.length === 0) return { label: '', color: '' };
    if (password.length < 8) return { label: 'Weak', color: 'bg-red-500/70' };
    if (password.length < 12) return { label: 'Good', color: 'bg-amber-500/70' };
    return { label: 'Strong', color: 'bg-emerald-500/70' };
  };

  const strength = getPasswordStrength();

  const showNotification = (type: 'success' | 'error', message: string, description?: string) => {
    setNotification({ type, message, description });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      if (!passwordsMatch) {
        showNotification('error', 'Passwords do not match');
      } else if (!confirmPassword) {
        showNotification('error', 'Please confirm your password');
      } else {
        showNotification('error', 'Please complete all fields correctly');
      }
      return;
    }

    setIsLoading(true);

    try {
      console.log('🚀 Starting signup process...');
      
      await authService.signUp({
        firstName,
        lastName,
        organisationName: organizationName, // Map to backend field name
        phoneNumber,
        email,
        password,
      });
      
      setIsLoading(false);
      showNotification('success', 'Account created successfully!', 'Redirecting to sign in...');

      // Clear form
      setTimeout(() => {
        setFirstName('');
        setLastName('');
        setOrganizationName('');
        setPhoneNumber('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setLocation('/auth/signin');
      }, 2000);
    } catch (error) {
      setIsLoading(false);
      console.error('Signup error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Signup failed unexpectedly';
      showNotification('error', 'Signup Failed', errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 min-w-[320px] max-w-md animate-in slide-in-from-top-5 ${notification.type === 'success'
          ? 'bg-emerald-50 border border-emerald-200'
          : 'bg-red-50 border border-red-200'
          } rounded-lg shadow-lg p-4`}>
          <div className="flex items-start gap-3">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-semibold ${notification.type === 'success' ? 'text-emerald-900' : 'text-red-900'
                }`}>
                {notification.message}
              </p>
              {notification.description && (
                <p className={`text-sm mt-1 ${notification.type === 'success' ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                  {notification.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Left Panel - Branding Section */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-700 p-16 flex-col justify-center items-center relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-24 left-12 w-24 h-24 bg-indigo-400 rounded-full opacity-20 blur-xl"></div>
        <div className="absolute bottom-32 right-20 w-40 h-40 bg-blue-400 rounded-full opacity-20 blur-xl"></div>
        <div className="absolute top-1/3 right-16 w-32 h-32 border-4 border-indigo-300 opacity-15 transform rotate-45"></div>

        {/* Content */}
        <div className="relative z-10 text-center max-w-md">
          <div className="mx-auto mb-10 w-56 h-56 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl">
            <img src="https://avatars.githubusercontent.com/u/255135070?s=200&v=4" alt="EBoard Logo" className="w-full h-full object-cover rounded-3xl" />
          </div>
          <h1 className="text-white text-5xl font-bold leading-tight mb-6">
            Welcome to<br />EBoard Portal
          </h1>
          <p className="text-indigo-100 text-xl">
            Streamline your organization's<br />management and collaboration
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100/70 to-indigo-50/30 dark:from-slate-950 dark:via-slate-950/90 dark:to-indigo-950/30 px-6 py-12 lg:px-12">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600/90 to-blue-700/90 shadow-lg shadow-indigo-500/30 overflow-hidden">
              <img src="https://avatars.githubusercontent.com/u/255135070?s=200&v=4" alt="EBoard Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-3">
              Create Organization Admin Account
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Register as organization administrator
            </p>
          </div>

          {/* Card */}
          <Card className="border border-slate-200/70 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 rounded-2xl overflow-hidden">
            <CardHeader className="px-10 pt-10 pb-6">
              <CardTitle className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
                Admin Registration
              </CardTitle>
              <CardDescription className="mt-2 text-base text-slate-600 dark:text-slate-400">
                Please fill in your information below
              </CardDescription>
            </CardHeader>

            <CardContent className="px-10 pb-10">
              <form onSubmit={handleSubmit} className="space-y-7">
                {/* First Name & Last Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="firstName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      First Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                      <Input
                        id="firstName"
                        placeholder="Enter First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="h-12 pl-11 pr-4 bg-white/70 dark:bg-slate-800/60 border-slate-300/80 dark:border-slate-700/70 text-base focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200"
                        required
                        minLength={3}
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="lastName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="Enter Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-12 px-4 bg-white/70 dark:bg-slate-800/60 border-slate-300/80 dark:border-slate-700/70 text-base focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200"
                      required
                      minLength={3}
                    />
                  </div>
                </div>

                {/* Organization Name */}
                <div className="space-y-2.5">
                  <Label htmlFor="organizationName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Organization Name
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    <Input
                      id="organizationName"
                      placeholder="Enter Organization Name"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className="h-12 pl-11 pr-4 bg-white/70 dark:bg-slate-800/60 border-slate-300/80 dark:border-slate-700/70 text-base focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200"
                      required
                      minLength={3}
                    />
                  </div>
                </div>

                {/* Phone Number & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="phoneNumber" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                      <Input
                        id="phoneNumber"
                        type="tel"
                        placeholder="+254 712 345 678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="h-12 pl-11 pr-4 bg-white/70 dark:bg-slate-800/60 border-slate-300/80 dark:border-slate-700/70 text-base focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value.trim())}
                        className="h-12 pl-11 pr-4 bg-white/70 dark:bg-slate-800/60 border-slate-300/80 dark:border-slate-700/70 text-base focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2.5">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pl-11 pr-12 bg-white/70 dark:bg-slate-800/60 border-slate-300/80 dark:border-slate-700/70 text-base focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  {password && (
                    <div className="space-y-2 pt-2">
                      <div className="h-2 w-full bg-slate-200/70 dark:bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${strength.color}`}
                          style={{ width: password.length < 8 ? '33%' : password.length < 12 ? '66%' : '100%' }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Password strength:{' '}
                        <span className={
                          strength.color.includes('red')
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : strength.color.includes('amber')
                              ? 'text-amber-600 dark:text-amber-400 font-medium'
                              : 'text-emerald-600 dark:text-emerald-400 font-medium'
                        }>
                          {strength.label}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2.5">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`h-12 pl-11 pr-12 bg-white/70 dark:bg-slate-800/60 border-slate-300/80 dark:border-slate-700/70 text-base focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200 ${confirmPassword && !passwordsMatch ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''
                        }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  {confirmPassword && !passwordsMatch && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                      Passwords do not match
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <Button
                    type="submit"
                    disabled={isLoading || !isFormValid}
                    className="w-full h-12 text-lg font-medium bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Admin Account'
                    )}
                  </Button>
                </div>
              </form>

              <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
                Already have an account?{' '}
                <button
                  type="button"
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium hover:underline"
                  onClick={() => setLocation('/auth/signin')}
                >
                  Sign in
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}