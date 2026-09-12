"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FiChevronLeft, FiMail } from "react-icons/fi";
import { FaUserCircle } from "react-icons/fa";
import { RiPencilFill } from "react-icons/ri";
import { EditProfileModal } from "@/components/editProfileModal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface UserProfile {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  default_avatar?: string | null;
  role?: string | null;
  created_at?: string | null;
  user_metadata?: Record<string, any> | null;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string>("/Avatar1.svg");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Controle de permissão de edição (apenas o dono pode editar)
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchUser = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${userId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Usuário não encontrado.");
          }
          throw new Error("Falha ao carregar informações do perfil.");
        }

        const data: UserProfile = await res.json();
        setProfile(data);

        // Define a foto de perfil inicial
        const photo =
          data.avatar_url ||
          data.user_metadata?.avatar_url ||
          data.default_avatar ||
          data.user_metadata?.default_avatar ||
          data.user_metadata?.picture ||
          "/Avatar1.svg";

        setAvatarSrc(photo);

        // Verifica se o usuário autenticado na sessão é o dono deste perfil
        try {
          const rawLogged =
            localStorage.getItem("partner_user") || sessionStorage.getItem("partner_user");
          if (rawLogged) {
            const loggedUser = JSON.parse(rawLogged);
            if (loggedUser.id === data.id || loggedUser.email === data.email) {
              setIsOwner(true);
            }
          }
        } catch {
          // Ignora erro de parse da sessão
        }
      } catch (err: any) {
        setError(err.message || "Erro ao buscar usuário.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleSaveProfile = ({
    firstName,
    lastName,
    email,
    avatarUrl,
    defaultAvatar,
  }: {
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string;
    defaultAvatar?: string;
    password?: string;
  }) => {
    if (!profile) return;

    const updatedFullName = `${firstName} ${lastName}`.trim();
    const updatedAvatar = avatarUrl || avatarSrc || defaultAvatar || "/Avatar1.svg";
    const updatedDefaultAvatar = defaultAvatar || profile.default_avatar || "/Avatar1.svg";

    const updatedProfile: UserProfile = {
      ...profile,
      first_name: firstName,
      last_name: lastName,
      full_name: updatedFullName,
      email: email,
      avatar_url: updatedAvatar,
      default_avatar: updatedDefaultAvatar,
    };

    setProfile(updatedProfile);
    setAvatarSrc(updatedAvatar);

    // Se for o usuário logado, atualiza também a sessão local
    try {
      const rawLogged =
        localStorage.getItem("partner_user") || sessionStorage.getItem("partner_user");
      if (rawLogged) {
        const loggedUser = JSON.parse(rawLogged);
        const updatedLogged = {
          ...loggedUser,
          first_name: firstName,
          last_name: lastName,
          full_name: updatedFullName,
          avatar_url: updatedAvatar,
          default_avatar: updatedDefaultAvatar,
        };
        if (localStorage.getItem("partner_user")) {
          localStorage.setItem("partner_user", JSON.stringify(updatedLogged));
        } else {
          sessionStorage.setItem("partner_user", JSON.stringify(updatedLogged));
        }
      }
    } catch {
      // Ignora erro
    }
  };

  // Tela de Carregando
  if (loading) {
    return (
      <div className="w-full min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-zinc-300 border-t-[#ea384c] rounded-full animate-spin mb-4" />
        <p className="text-zinc-600 font-medium text-sm">Carregando perfil...</p>
      </div>
    );
  }

  // Tela de Erro / Não encontrado
  if (error || !profile) {
    return (
      <div className="w-full min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
        <FaUserCircle className="text-zinc-300 text-7xl mb-4" />
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Usuário não encontrado</h2>
        <p className="text-zinc-500 text-sm max-w-sm mb-6">
          Não foi possível localizar o perfil solicitado. Ele pode ter sido removido ou o ID está incorreto.
        </p>
        <Link
          href="/home"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors"
        >
          <FiChevronLeft size={16} /> Voltar para o início
        </Link>
      </div>
    );
  }

  const displayName =
    profile.full_name ||
    (profile.first_name || profile.last_name
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
      : "Usuário");

  const email = profile.email || "";

  return (
    <div className="w-full min-h-screen bg-white flex flex-col relative text-zinc-900">
      {/* Banner Superior Escuro */}
      <div className="w-full h-56 md:h-64 bg-black relative px-8 md:px-14 pt-8 flex items-start justify-between">
        {/* Botão Voltar */}
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 text-zinc-200 hover:text-white transition-colors text-sm font-medium tracking-wide group cursor-pointer"
        >
          <FiChevronLeft size={18} className="transition-transform group-hover:-translate-x-1" />
          <span>Voltar</span>
        </Link>
      </div>

      {/* Conteúdo Principal do Perfil */}
      <div className="w-full px-8 md:px-14 relative pb-16">
        {/* Linha com Avatar e Botão Editar Perfil */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-24 md:-mt-28 mb-4">
          {/* Avatar Circular */}
          <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-white bg-zinc-200 shadow-xl shrink-0">
            <img
              src={avatarSrc}
              alt={displayName}
              className="w-full h-full object-cover"
              onError={() => setAvatarSrc("/Avatar1.svg")}
            />
          </div>

          {/* Botão Editar Perfil (Aparece se for o dono do perfil) */}
          {isOwner && (
            <div className="flex items-center md:pb-2">
              <button
                onClick={() => setIsEditing(true)}
                type="button"
                className="bg-[#ea384c] hover:bg-[#F14343] active:scale-95 text-white text-base md:text-lg font-semibold px-7 py-2.5 rounded-full flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <span>Editar Perfil</span>
                <RiPencilFill size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Informações do Usuário */}
        <div className="flex flex-col mt-2">
          <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-950 tracking-tight">
            {displayName}
          </h1>

          {email && (
            <div className="flex items-center gap-2 text-zinc-600 text-sm md:text-base font-normal mt-2">
              <FiMail size={17} className="text-zinc-500 shrink-0" />
              <span>{email}</span>
            </div>
          )}
        </div>

        {/* Divisória / Espaço */}
        <div className="w-full my-12 border-b border-zinc-100" />

        {/* Estado Vazio de Contribuições */}
        <div className="w-full flex flex-col items-center justify-center py-12 text-center">
          <FaUserCircle className="text-zinc-400 text-6xl md:text-7xl mb-4 opacity-70" />
          <p className="text-zinc-500 text-lg md:text-xl font-light tracking-wide">
            Você ainda não possui nenhuma contribuição
          </p>
        </div>
      </div>

      {/* Componente Modal de Edição de Perfil */}
      {isOwner && (
        <EditProfileModal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          userId={profile.id}
          initialFirstName={profile.first_name || ""}
          initialLastName={profile.last_name || ""}
          initialEmail={profile.email || ""}
          initialAvatarUrl={avatarSrc}
          initialDefaultAvatar={profile.default_avatar || profile.user_metadata?.default_avatar || "/Avatar1.svg"}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
}
