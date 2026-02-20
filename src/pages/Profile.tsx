import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Phone,
  Users,
  Globe,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Shield,
  Settings,
  HelpCircle,
  LogOut,
  Camera,
  Loader2,
  Bell,
  Lock,
  MapPin,
  MessageSquare,
  Bug,
  AlertTriangle,
  BookOpen,
  Mail,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import FloatingSOS from "@/components/FloatingSOS";
import gsap from "gsap";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";
import AvatarPicker from "@/components/AvatarPicker";
import DarkModeToggle from "@/components/DarkModeToggle";
import { supabase } from "@/integrations/supabase/client";
import { updateUserProfile, getCurrentUser } from "@/integrations/supabase/auth";

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  isPrimary: boolean;
}

const Profile = () => {
  const { toast } = useToast();
  const { t, language, setLanguage, languageNames, availableLanguages } = useLanguage();
  const { name: userName, phone: userPhone, avatar, setName, setPhone, setAvatar } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [editForm, setEditForm] = useState({ name: userName, phone: userPhone });
  const [showLanguages, setShowLanguages] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", relation: "" });
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { id: "1", name: "Mom", phone: "+91 98765 00001", relation: "Mother", isPrimary: true },
    { id: "2", name: "Dad", phone: "+91 98765 00002", relation: "Father", isPrimary: false },
  ]);

  // Settings & Help sections
  const [showSettings, setShowSettings] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  // Animation refs
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  // Load emergency contacts from Supabase
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          // @ts-ignore
          const { data } = await supabase
            .from('users_profile')
            .select('emergency_contacts')
            .eq('id', user.id)
            .single();
          
          if (data && data.emergency_contacts) {
            setContacts(data.emergency_contacts);
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };
    
    loadUserData();
  }, []);

  // GSAP bubble animation for icons
  useEffect(() => {
    if (cardsContainerRef.current) {
      const iconContainers = cardsContainerRef.current.querySelectorAll('.icon-bubble');
      
      gsap.fromTo(
        iconContainers,
        {
          scale: 0,
          opacity: 0,
        },
        {
          scale: 1,
          opacity: 1,
          duration: 0.6,
          ease: 'elastic.out(1, 0.5)',
          stagger: 0.1,
        }
      );
    }
  }, []);

  const handleStartEdit = () => {
    setEditForm({ name: userName, phone: userPhone });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // Update local context
      setName(editForm.name);
      setPhone(editForm.phone);
      
      // Update Supabase
      const { error } = await updateUserProfile({
        fullName: editForm.name,
        phoneNumber: editForm.phone,
      });
      
      if (error) {
        toast({
          title: "Save Failed",
          description: error.message || "Failed to save profile to database",
          variant: "destructive",
        });
        return;
      }
      
      setIsEditing(false);
      toast({
        title: t.save,
        description: "Your profile has been saved successfully to Supabase",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone || !newContact.relation) {
      toast({
        title: "Missing Information",
        description: "Please fill in all contact fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const contact: EmergencyContact = {
        id: Date.now().toString(),
        name: newContact.name,
        phone: newContact.phone,
        relation: newContact.relation,
        isPrimary: contacts.length === 0,
      };

      const updatedContacts = [...contacts, contact];
      setContacts(updatedContacts);
      
      // Save to Supabase
      const user = await getCurrentUser();
      if (user) {
        const { error } = await supabase
          .from('users_profile')
          .update({ emergency_contacts: updatedContacts })
          .eq('id', user.id);
        
        if (error) {
          throw error;
        }
      }
      
      setNewContact({ name: "", phone: "", relation: "" });
      setShowAddContact(false);
      toast({
        title: t.add,
        description: `${contact.name} has been added as an emergency contact`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add contact",
        variant: "destructive",
      });
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      const updatedContacts = contacts.filter((c) => c.id !== id);
      setContacts(updatedContacts);
      
      // Save to Supabase
      const user = await getCurrentUser();
      if (user) {
        const { error } = await supabase
          .from('users_profile')
          .update({ emergency_contacts: updatedContacts })
          .eq('id', user.id);
        
        if (error) {
          throw error;
        }
      }
      
      toast({
        title: t.delete,
        description: "Emergency contact has been deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact",
        variant: "destructive",
      });
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      const updatedContacts = contacts.map((c) => ({
        ...c,
        isPrimary: c.id === id,
      }));
      setContacts(updatedContacts);
      
      // Save to Supabase
      const user = await getCurrentUser();
      if (user) {
        const { error } = await supabase
          .from('users_profile')
          .update({ emergency_contacts: updatedContacts })
          .eq('id', user.id);
        
        if (error) {
          throw error;
        }
      }
      
      toast({
        title: t.primary,
        description: "This contact will be notified first in emergencies",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to set primary contact",
        variant: "destructive",
      });
    }
  };

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    setShowLanguages(false);
    toast({
      title: t.language,
      description: `App language set to ${languageNames[lang]}`,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-hero px-6 pt-8 pb-20 rounded-b-[2rem]">
        <div className="flex items-center gap-4 mb-6">
          <Link
            to="/home"
            className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </Link>
          <h1 className="text-xl font-bold text-primary-foreground">{t.myProfile}</h1>
        </div>

        {/* Profile Card */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAvatarPicker(true)}
            className="relative w-20 h-20 rounded-full bg-primary-foreground/20 flex items-center justify-center group"
          >
            <span className="text-4xl">{avatar}</span>
            <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-primary-foreground">{userName}</h2>
            <p className="text-primary-foreground/80">{userPhone || "No phone set"}</p>
          </div>
          <button
            onClick={handleStartEdit}
            className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center"
          >
            <Edit2 className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>
      </div>

      <div ref={cardsContainerRef} className="px-6 -mt-8 space-y-6">
        {/* Avatar Picker */}
        {showAvatarPicker && (
          <AvatarPicker
            selected={avatar}
            onSelect={setAvatar}
            onClose={() => setShowAvatarPicker(false)}
          />
        )}

        {/* Edit Profile Modal */}
        {isEditing && (
          <div className="travel-card animate-scale-in">
            <h3 className="text-lg font-semibold mb-4">{t.edit} {t.profile}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t.name}</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="input-travel mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t.phone}</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="input-travel mt-1"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsEditing(false)} className="flex-1 btn-secondary">
                  {t.cancel}
                </button>
                <button 
                  onClick={handleSaveProfile} 
                  disabled={isSaving}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    t.save
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Contacts */}
        <div className="travel-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="icon-bubble w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold">{t.emergencyContacts}</h3>
                <p className="text-sm text-muted-foreground">{t.sosAlertRecipients}</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddContact(true)}
              className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"
            >
              <Plus className="w-5 h-5 text-primary" />
            </button>
          </div>

          {/* Contact List */}
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      {contact.name}
                      {contact.isPrimary && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {t.primary}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{contact.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!contact.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(contact.id)}
                      className="p-2 rounded-lg hover:bg-card"
                    >
                      <Shield className="w-4 h-4 text-primary" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteContact(contact.id)}
                    className="p-2 rounded-lg hover:bg-card"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Contact Form */}
          {showAddContact && (
            <div className="mt-4 p-4 rounded-xl bg-secondary animate-fade-in">
              <h4 className="font-medium mb-3">{t.addNewContact}</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder={t.name}
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="input-travel"
                />
                <input
                  type="tel"
                  placeholder={t.phone}
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="input-travel"
                />
                <input
                  type="text"
                  placeholder={t.relation}
                  value={newContact.relation}
                  onChange={(e) => setNewContact({ ...newContact, relation: e.target.value })}
                  className="input-travel"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddContact(false)}
                    className="flex-1 btn-secondary"
                  >
                    {t.cancel}
                  </button>
                  <button onClick={handleAddContact} className="flex-1 btn-primary">
                    {t.add}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Language Settings */}
        <div className="travel-card">
          <button
            onClick={() => setShowLanguages(!showLanguages)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="icon-bubble w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">{t.language}</h3>
                <p className="text-sm text-muted-foreground">{languageNames[language]}</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showLanguages ? "rotate-90" : ""}`} />
          </button>

          {showLanguages && (
            <div className="mt-4 space-y-2 animate-fade-in">
              {availableLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageSelect(lang)}
                  className={`w-full p-3 rounded-xl text-left transition-colors ${
                    language === lang
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  {languageNames[lang]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <div className="travel-card">
          <DarkModeToggle />
        </div>

        {/* Settings Section */}
        <div className="travel-card">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="icon-bubble w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">{t.settings || "Settings"}</h3>
                <p className="text-sm text-muted-foreground">App preferences & privacy</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showSettings ? "rotate-180" : ""}`} />
          </button>

          {showSettings && (
            <div className="mt-3 space-y-1 animate-fade-in border-t pt-3">
              {/* Profile */}
              <button
                onClick={handleStartEdit}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div className="text-left">
                    <span className="font-medium text-sm">Profile</span>
                    <p className="text-xs text-muted-foreground">Name, phone & avatar</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Location */}
              <div className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div className="text-left">
                    <span className="font-medium text-sm">Location</span>
                    <p className="text-xs text-muted-foreground">Allow location access</p>
                  </div>
                </div>
                <button
                  onClick={() => setLocationEnabled(!locationEnabled)}
                  className="text-primary"
                  aria-label="Toggle location"
                >
                  {locationEnabled
                    ? <ToggleRight className="w-7 h-7" />
                    : <ToggleLeft className="w-7 h-7 text-muted-foreground" />}
                </button>
              </div>

              {/* Preferences */}
              <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <div className="text-left">
                    <span className="font-medium text-sm">Preferences</span>
                    <p className="text-xs text-muted-foreground">Travel style & interests</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Privacy */}
              <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  <div className="text-left">
                    <span className="font-medium text-sm">Privacy</span>
                    <p className="text-xs text-muted-foreground">Data & account privacy</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Notifications */}
              <div className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <div className="text-left">
                    <span className="font-medium text-sm">Notifications</span>
                    <p className="text-xs text-muted-foreground">Alerts & reminders</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className="text-primary"
                  aria-label="Toggle notifications"
                >
                  {notificationsEnabled
                    ? <ToggleRight className="w-7 h-7" />
                    : <ToggleLeft className="w-7 h-7 text-muted-foreground" />}
                </button>
              </div>

              {/* Logout */}
              <Link
                to="/"
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-destructive/10 transition-colors text-destructive"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5" />
                  <div className="text-left">
                    <span className="font-medium text-sm">{t.logout || "Logout"}</span>
                    <p className="text-xs text-destructive/70">Sign out of your account</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Help & Support Section */}
        <div className="travel-card">
          <button
            onClick={() => setShowHelpSupport(!showHelpSupport)}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="icon-bubble w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">{t.helpSupport || "Help & Support"}</h3>
                <p className="text-sm text-muted-foreground">FAQs, contact & emergency</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showHelpSupport ? "rotate-180" : ""}`} />
          </button>

          {showHelpSupport && (
            <div className="mt-3 space-y-1 animate-fade-in border-t pt-3">
              {/* FAQs */}
              <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                  <div className="text-left">
                    <span className="font-medium text-sm">FAQs</span>
                    <p className="text-xs text-muted-foreground">Frequently asked questions</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Contact Us */}
              <a
                href="mailto:support@miniguide.app"
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div className="text-left">
                    <span className="font-medium text-sm">Contact Us</span>
                    <p className="text-xs text-muted-foreground">support@miniguide.app</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </a>

              {/* Report Issue */}
              <button
                onClick={() => toast({ title: "Report Issue", description: "Thank you! We'll look into this shortly." })}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bug className="w-5 h-5 text-muted-foreground" />
                  <div className="text-left">
                    <span className="font-medium text-sm">Report Issue</span>
                    <p className="text-xs text-muted-foreground">Found a bug? Let us know</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Emergency Help */}
              <button
                onClick={() => toast({ title: "Emergency Help", description: "Call 112 for police/fire/ambulance" })}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-destructive/10 transition-colors text-destructive"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5" />
                  <div className="text-left">
                    <span className="font-medium text-sm">Emergency Help</span>
                    <p className="text-xs text-destructive/70">Police · Fire · Ambulance (112)</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Feedback */}
              <button
                onClick={() => toast({ title: "Feedback", description: "Thanks for your feedback! We'll use it to improve." })}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  <div className="text-left">
                    <span className="font-medium text-sm">Feedback</span>
                    <p className="text-xs text-muted-foreground">Share your suggestions</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating SOS Button */}
      <FloatingSOS />

      <BottomNav />
    </div>
  );
};

export default Profile;
