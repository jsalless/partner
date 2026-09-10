"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FiX,
  FiCheck,
  FiUpload,
  FiUser,
  FiTrash2,
  FiMail,
  FiLock,
  FiAlertTriangle,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";

const DEFAULT_AVATARS = [
  "/Avatar1.svg",
  "/Avatar2.svg",
  "/Avatar3.svg",
  "/Avatar4.svg",
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  initialFirstName: string;
  initialLastName: string;
  initialEmail: string;
  initialAvatarUrl: string;
  onSave: (data: {
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string;
    password?: string;
  }) => Promise<void> | void;
  onDeleteAccount?: () => Promise<void> | void;
}

export function EditProfileModal({
  isOpen,
  onClose,
  userId,
  initialFirstName,
  initialLastName,
  initialEmail,
  initialAvatarUrl,
  onSave,
  onDeleteAccount,
}: EditProfileModalProps) {
  const router = useRouter();

  // Estados dos campos
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Estados de foto/avatar
  const [selectedAvatar, setSelectedAvatar] = useState(initialAvatarUrl || "/Avatar1.svg");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de controle e feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Estado de confirmação de exclusão
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFirstName(initialFirstName);
      setLastName(initialLastName);
      setEmail(initialEmail);
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowDeleteConfirm(false);
      setErrorMessage(null);
      setSavedSuccess(false);

      if (initialAvatarUrl?.startsWith("data:image")) {
        setUploadedImage(initialAvatarUrl);
        setSelectedAvatar(initialAvatarUrl);
      } else {
        setSelectedAvatar(initialAvatarUrl || "/Avatar1.svg");
        setUploadedImage(null);
      }
      setFileName("");
    }
  }, [isOpen, initialFirstName, initialLastName, initialEmail, initialAvatarUrl]);

  // Fecha modal com tecla ESC (se não estiver excluindo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, deleting]);

  if (!isOpen) return null;

  const currentPreview = uploadedImage || selectedAvatar;

  const handleSelectPresetAvatar = (avatarPath: string) => {
    setSelectedAvatar(avatarPath);
    setUploadedImage(null);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Selecione um arquivo de imagem válido (PNG, JPG, WebP, SVG).");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setErrorMessage("A imagem selecionada deve ter no máximo 4MB.");
      return;
    }

    setErrorMessage(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setUploadedImage(result);
        setSelectedAvatar(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveUploadedImage = () => {
    setUploadedImage(null);
    setFileName("");
    setSelectedAvatar("/Avatar1.svg");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validação de senha se preenchida
    if (newPassword) {
      if (newPassword.length < 6) {
        setErrorMessage("A nova senha deve ter no mínimo 6 caracteres.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage("A confirmação de senha não confere com a nova senha.");
        return;
      }
    }

    setLoading(true);

    try {
      const finalAvatar = uploadedImage || selectedAvatar;

      // Chama a função onSave passada pelo componente pai
      await onSave({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        avatarUrl: finalAvatar,
        password: newPassword ? newPassword : undefined,
      });

      // Se tiver userId, atualiza também diretamente no backend
      if (userId) {
        const payload: Record<string, any> = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          avatar_url: finalAvatar,
        };
        if (newPassword) {
          payload.password = newPassword;
        }

        const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Erro ao salvar alterações na API.");
        }
      }

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || "Falha ao atualizar perfil.");
    } finally {
      setLoading(false);
    }
  };

  // Excluir conta
  const handleDeleteAccount = async () => {
    setDeleting(true);
    setErrorMessage(null);

    try {
      if (onDeleteAccount) {
        await onDeleteAccount();
      } else if (userId) {
        const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Erro ao excluir conta na API.");
        }
      }

      // Limpa dados de autenticação locais
      localStorage.removeItem("partner_token");
      localStorage.removeItem("partner_user");
      sessionStorage.removeItem("partner_token");
      sessionStorage.removeItem("partner_user");

      onClose();
      router.push("/login");
    } catch (err: any) {
      setErrorMessage(err.message || "Não foi possível excluir a conta.");
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#121214] border border-zinc-800/90 w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative text-white animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow sutil no topo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-[#ea384c]/15 blur-3xl pointer-events-none" />

        {/* Header do Modal */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-800/80 flex items-center justify-between relative z-10 shrink-0">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Editar Perfil</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Altere seus dados, e-mail, senha ou gerencie sua conta
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800/70 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6 relative z-10">
          {/* Mensagem de Erro Geral */}
          {errorMessage && (
            <div className="text-xs text-red-300 bg-red-950/60 border border-red-800/70 p-3 rounded-xl flex items-center gap-2">
              <FiAlertTriangle size={16} className="text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Feedback de sucesso */}
          {savedSuccess && (
            <div className="bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 animate-in fade-in">
              <FiCheck size={16} className="text-emerald-400" />
              <span>Perfil atualizado com sucesso!</span>
            </div>
          )}

          {/* Seção 1: Foto e Avatar */}
          <div className="flex flex-col gap-4 p-4 rounded-2xl bg-[#18181b] border border-zinc-800/80">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Preview Circular */}
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#ea384c] bg-zinc-900 shadow-md shrink-0 flex items-center justify-center">
                <img
                  src={currentPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={() => setSelectedAvatar("/Avatar1.svg")}
                />
              </div>

              {/* Botão de Upload de Foto */}
              <div className="flex-1 w-full text-center sm:text-left flex flex-col justify-center">
                <span className="text-xs font-semibold text-zinc-300 block mb-2">
                  Foto de perfil personalizada:
                </span>

                <input
                  ref={fileInputRef}
                  type="file"
                  id="profile-photo-upload"
                  accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/70 text-xs font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer active:scale-95"
                  >
                    <FiUpload size={14} className="text-[#ea384c]" />
                    <span>Fazer upload de foto</span>
                  </button>

                  {uploadedImage && (
                    <button
                      type="button"
                      onClick={handleRemoveUploadedImage}
                      title="Remover foto enviada"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-xs font-medium text-red-300 hover:text-red-200 transition-colors cursor-pointer"
                    >
                      <FiTrash2 size={13} />
                      <span>Remover</span>
                    </button>
                  )}
                </div>

                {fileName && (
                  <span className="text-[11px] text-zinc-400 mt-1.5 truncate max-w-xs block">
                    Arquivo: <strong className="text-zinc-200">{fileName}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Avatares Predefinidos */}
            <div className="border-t border-zinc-800/60 pt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-xs text-zinc-400">
                Ou escolha um avatar padrão:
              </span>
              <div className="flex items-center gap-2">
                {DEFAULT_AVATARS.map((avatarPath, index) => {
                  const isSelected =
                    !uploadedImage &&
                    (selectedAvatar === avatarPath ||
                      selectedAvatar.toLowerCase() === avatarPath.toLowerCase());
                  return (
                    <button
                      key={avatarPath}
                      type="button"
                      onClick={() => handleSelectPresetAvatar(avatarPath)}
                      title={`Avatar ${index + 1}`}
                      className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all cursor-pointer p-0.5 ${
                        isSelected
                          ? "border-[#ea384c] scale-110 shadow-md shadow-[#ea384c]/30 ring-2 ring-[#ea384c]/20"
                          : "border-zinc-700/80 hover:border-zinc-500 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={avatarPath}
                        alt={`Avatar ${index + 1}`}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Seção 2: Dados Pessoais (Nome e Sobrenome) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <FiUser className="text-zinc-400" />
                  <span>Nome</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Seu nome"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1c1c20] border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#ea384c] focus:ring-2 focus:ring-[#ea384c]/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <FiUser className="text-zinc-400" />
                  <span>Sobrenome</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Seu sobrenome"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1c1c20] border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#ea384c] focus:ring-2 focus:ring-[#ea384c]/20 transition-all"
                />
              </div>
            </div>

            {/* Seção 3: Alterar E-mail */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <FiMail className="text-zinc-400" />
                <span>E-mail</span>
              </label>
              <input
                type="email"
                required
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#1c1c20] border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#ea384c] focus:ring-2 focus:ring-[#ea384c]/20 transition-all"
              />
            </div>

            {/* Seção 4: Alterar Senha */}
            <div className="p-4 rounded-2xl bg-[#18181b] border border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <FiLock className="text-zinc-400" />
                  <span>Alterar Senha</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {showPassword ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                  <span>{showPassword ? "Ocultar" : "Mostrar"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Nova senha (mínimo 6)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#1c1c20] border border-zinc-800 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#ea384c] focus:ring-2 focus:ring-[#ea384c]/20 transition-all"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirmar nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#1c1c20] border border-zinc-800 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#ea384c] focus:ring-2 focus:ring-[#ea384c]/20 transition-all"
                />
              </div>
              <span className="text-[11px] text-zinc-500 block">
                Deixe em branco caso não deseje alterar sua senha.
              </span>
            </div>
          </form>

          {/* Seção 5: Exclusão de Conta */}
          <div className="p-4 rounded-2xl bg-[#18181b] border border-zinc-800/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <FiTrash2 size={14} className="text-zinc-400" />
                  <h4 className="text-xs font-semibold text-zinc-200">Excluir Conta</h4>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Encerre sua conta permanentemente e remova todos os seus dados.
                </p>
              </div>

              {!showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="self-start sm:self-auto px-3.5 py-2 rounded-xl text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 hover:border-red-500/30 transition-all cursor-pointer shrink-0"
                >
                  Excluir conta
                </button>
              )}
            </div>

            {/* Confirmação de exclusão */}
            {showDeleteConfirm && (
              <div className="pt-3 border-t border-zinc-800/80 space-y-2.5 animate-in fade-in duration-200">
                <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/30 text-xs text-red-200/90 leading-relaxed">
                  Tem certeza de que deseja prosseguir? Esta ação é irreversível e todos os seus dados serão apagados definitivamente.
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {deleting ? "Excluindo conta..." : "Sim, excluir conta"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="px-4 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com botões de Ação */}
        <div className="px-6 py-4 border-t border-zinc-800/80 flex items-center justify-end gap-3 bg-[#151518] relative z-10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading || deleting}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="edit-profile-form"
            disabled={loading || deleting}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#ea384c] hover:bg-[#d92d41] active:scale-95 text-white shadow-lg shadow-[#ea384c]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <FiCheck size={16} />
            <span>{loading ? "Salvando..." : "Salvar Alterações"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
