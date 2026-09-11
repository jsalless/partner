"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    FiArrowLeftCircle,
    FiArrowRightCircle,
    FiLogIn,
    FiUserPlus,
    FiEye,
    FiEyeOff,
} from "react-icons/fi";
import { FaGoogle, FaGithub } from "react-icons/fa6";
import styles from "./page.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LoginPage() {
    const router = useRouter();
    const [isRegister, setIsRegister] = useState(false);

    // Login state
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Register state
    const [registerFirstName, setRegisterFirstName] = useState("");
    const [registerLastName, setRegisterLastName] = useState("");
    const [registerEmail, setRegisterEmail] = useState("");
    const [registerPassword, setRegisterPassword] = useState("");
    const [showRegisterPassword, setShowRegisterPassword] = useState(false);
    const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
    const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

    // Feedback state
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const clearMessages = () => {
        setErrorMsg("");
        setSuccessMsg("");
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        clearMessages();
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: loginEmail,
                    password: loginPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "Erro ao realizar login.");
            }

            if (data.access_token) {
                if (rememberMe) {
                    localStorage.setItem("partner_token", data.access_token);
                    localStorage.setItem("partner_user", JSON.stringify(data.user));
                } else {
                    sessionStorage.setItem("partner_token", data.access_token);
                    sessionStorage.setItem("partner_user", JSON.stringify(data.user));
                }
            }

            setSuccessMsg("Login realizado com sucesso! Redirecionando...");
            setTimeout(() => {
                router.push("/home");
            }, 800);
        } catch (err: any) {
            setErrorMsg(err.message || "Falha na comunicação com o servidor.");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        clearMessages();

        if (registerPassword !== registerConfirmPassword) {
            setErrorMsg("As senhas não coincidem. Por favor, verifique.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    first_name: registerFirstName,
                    last_name: registerLastName,
                    email: registerEmail,
                    password: registerPassword,
                    confirm_password: registerConfirmPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "Erro ao criar conta.");
            }

            setSuccessMsg("Conta criada com sucesso! Você já pode fazer login.");
            // Se veio token direto, podemos armazenar
            if (data.access_token) {
                localStorage.setItem("partner_token", data.access_token);
                localStorage.setItem("partner_user", JSON.stringify(data.user));
                setTimeout(() => {
                    router.push("/home");
                }, 1000);
            } else {
                // Alterna para o painel de login após 1.5s
                setTimeout(() => {
                    setIsRegister(false);
                    clearMessages();
                    setLoginEmail(registerEmail);
                }, 1500);
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Falha ao registrar usuário.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className={styles.page}>
            <section className={styles.imageSection} aria-label="Apresentacao da plataforma">
                <Image
                    src="/Login.svg"
                    alt="Partner Login"
                    width={1207}
                    height={806}
                    className={styles.image}
                    priority
                />
            </section>

            <section className={styles.formSide} aria-label="Autenticacao">
                <div
                    className={`${styles.card} ${isRegister ? styles.active : styles.close}`}
                    id="container"
                >
                    <div className={styles.loginPanel}>
                        <div className={styles.content}>
                            <h3>Login</h3>
                            <div className={styles.socialIcons} aria-hidden="true">
                                <button type="button" className={styles.iconButton}>
                                    <FaGoogle />
                                </button>
                                <button type="button" className={styles.iconButton}>
                                    <FaGithub />
                                </button>
                            </div>
                            <span className={styles.loginWith}>ou entre com seu e-mail</span>

                            {!isRegister && errorMsg && (
                                <div className={styles.alertError} role="alert">
                                    {errorMsg}
                                </div>
                            )}
                            {!isRegister && successMsg && (
                                <div className={styles.alertSuccess} role="status">
                                    {successMsg}
                                </div>
                            )}

                            <form className={styles.form} onSubmit={handleLogin}>
                                <input
                                    type="email"
                                    placeholder="E-mail"
                                    autoComplete="email"
                                    required
                                    value={loginEmail}
                                    onChange={(e) => setLoginEmail(e.target.value)}
                                />
                                <div className={styles.passwordContainer}>
                                    <input
                                        type={showLoginPassword ? "text" : "password"}
                                        placeholder="Senha"
                                        autoComplete="current-password"
                                        required
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                                        aria-label={showLoginPassword ? "Ocultar senha" : "Mostrar senha"}
                                    >
                                        {showLoginPassword ? <FiEyeOff /> : <FiEye />}
                                    </button>
                                </div>
                                <div className={styles.row}>
                                    <label className={styles.rememberLabel}>
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                        />
                                        Lembrar de mim
                                    </label>
                                    <button type="button" className={styles.linkButton}>
                                        Esqueci a senha
                                    </button>
                                </div>
                                <button
                                    type="submit"
                                    className={styles.primaryButton}
                                    disabled={loading}
                                >
                                    {loading ? "Entrando..." : "Entrar"}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className={styles.registerPanel}>
                        <div className={styles.content}>
                            <h3>Cadastro</h3>
                            <div className={styles.socialIcons} aria-hidden="true">
                                <button type="button" className={styles.iconButton}>
                                    <FaGoogle />
                                </button>
                                <button type="button" className={styles.iconButton}>
                                    <FaGithub />
                                </button>
                            </div>
                            <span className={styles.loginWith}>ou use seu e-mail para cadastro</span>

                            {isRegister && errorMsg && (
                                <div className={styles.alertError} role="alert">
                                    {errorMsg}
                                </div>
                            )}
                            {isRegister && successMsg && (
                                <div className={styles.alertSuccess} role="status">
                                    {successMsg}
                                </div>
                            )}

                            <form className={styles.form} onSubmit={handleRegister}>
                                <div className={styles.inputRow}>
                                    <input
                                        type="text"
                                        placeholder="Nome"
                                        autoComplete="given-name"
                                        required
                                        value={registerFirstName}
                                        onChange={(e) => setRegisterFirstName(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Sobrenome"
                                        autoComplete="family-name"
                                        required
                                        value={registerLastName}
                                        onChange={(e) => setRegisterLastName(e.target.value)}
                                    />
                                </div>
                                <input
                                    type="email"
                                    placeholder="E-mail"
                                    autoComplete="email"
                                    required
                                    value={registerEmail}
                                    onChange={(e) => setRegisterEmail(e.target.value)}
                                />
                                <div className={styles.passwordContainer}>
                                    <input
                                        type={showRegisterPassword ? "text" : "password"}
                                        placeholder="Senha (mínimo 6 caracteres)"
                                        autoComplete="new-password"
                                        required
                                        minLength={6}
                                        value={registerPassword}
                                        onChange={(e) => setRegisterPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                        aria-label={showRegisterPassword ? "Ocultar senha" : "Mostrar senha"}
                                    >
                                        {showRegisterPassword ? <FiEyeOff /> : <FiEye />}
                                    </button>
                                </div>
                                <div className={styles.passwordContainer}>
                                    <input
                                        type={showRegisterConfirmPassword ? "text" : "password"}
                                        placeholder="Confirmar senha"
                                        autoComplete="new-password"
                                        required
                                        minLength={6}
                                        value={registerConfirmPassword}
                                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                                        aria-label={showRegisterConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                                    >
                                        {showRegisterConfirmPassword ? <FiEyeOff /> : <FiEye />}
                                    </button>
                                </div>
                                <button
                                    type="submit"
                                    className={styles.primaryButton}
                                    disabled={loading}
                                >
                                    {loading ? "Cadastrando..." : "Cadastrar"}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className={`${styles.flipPage} ${styles.front}`}>
                        <div className={styles.content}>
                            <span className={styles.flipIcon} aria-hidden="true">
                                <FiUserPlus />
                            </span>
                            <h2>Salve, dev!</h2>
                            <p>Crie sua conta e comece a gerir seus projetos.</p>
                            <button
                                type="button"
                                id="register"
                                className={styles.ghostButton}
                                onClick={() => setIsRegister(true)}
                            >
                                Registrar <FiArrowRightCircle />
                            </button>
                        </div>
                    </div>

                    <div className={`${styles.flipPage} ${styles.back}`}>
                        <div className={styles.content}>
                            <span className={styles.flipIcon} aria-hidden="true">
                                <FiLogIn />
                            </span>
                            <h2>Bem-vindo de volta!</h2>
                            <p>Entre com seus dados para acompanhar seus projetos.</p>
                            <button
                                type="button"
                                id="login"
                                className={styles.ghostButton}
                                onClick={() => setIsRegister(false)}
                            >
                                <FiArrowLeftCircle /> Log In
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
