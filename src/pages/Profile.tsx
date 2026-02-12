import { useState } from "react";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import FloatingSOS from "@/components/FloatingSOS";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";
import AvatarPicker from "@/components/AvatarPicker";
import DarkModeToggle from "@/components/DarkModeToggle";

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
  const [newContact, setNewContact] = useState({ name: "", phone: "", relation: "" });
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { id: "1", name: "Mom", phone: "+91 98765 00001", relation: "Mother", isPrimary: true },
    { id: "2", name: "Dad", phone: "+91 98765 00002", relation: "Father", isPrimary: false },
  ]);

  const handleStartEdit = () => {
    setEditForm({ name: userName, phone: userPhone });
    setIsEditing(true);
  };

  const handleSaveProfile = () => {
    setName(editForm.name);
    setPhone(editForm.phone);
    setIsEditing(false);
    toast({
      title: t.save,
      description: "Your profile has been saved successfully",
    });
  };

  const handleAddContact = () => {
    if (!newContact.name || !newContact.phone || !newContact.relation) {
      toast({
        title: "Missing Information",
        description: "Please fill in all contact fields",
        variant: "destructive",
      });
      return;
    }

    const contact: EmergencyContact = {
      id: Date.now().toString(),
      name: newContact.name,
      phone: newContact.phone,
      relation: newContact.relation,
      isPrimary: contacts.length === 0,
    };

    setContacts([...contacts, contact]);
    setNewContact({ name: "", phone: "", relation: "" });
    setShowAddContact(false);
    toast({
      title: t.add,
      description: `${contact.name} has been added as an emergency contact`,
    });
  };

  const handleDeleteContact = (id: string) => {
    setContacts(contacts.filter((c) => c.id !== id));
    toast({
      title: t.delete,
      description: "Emergency contact has been deleted",
    });
  };

  const handleSetPrimary = (id: string) => {
    setContacts(
      contacts.map((c) => ({
        ...c,
        isPrimary: c.id === id,
      }))
    );
    toast({
      title: t.primary,
      description: "This contact will be notified first in emergencies",
    });
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

      <div className="px-6 -mt-8 space-y-6">
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
                <button onClick={handleSaveProfile} className="flex-1 btn-primary">
                  {t.save}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Contacts */}
        <div className="travel-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
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
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
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

        {/* Other Settings */}
        <div className="travel-card space-y-3">
          <button className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-secondary transition-colors">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">{t.settings}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-secondary transition-colors">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">{t.helpSupport}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <Link
            to="/"
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-destructive/10 transition-colors text-destructive"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5" />
              <span className="font-medium">{t.logout}</span>
            </div>
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Floating SOS Button */}
      <FloatingSOS />

      <BottomNav />
    </div>
  );
};

export default Profile;
