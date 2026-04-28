import { useState } from 'react';
import '../css/login.css'
import { useNavigate } from "react-router-dom";

const backendUrl = 'https://backend-nana-v2.onrender.com'

async function fetchUserData(id: string, password: string) {
    const response = await fetch(backendUrl+'/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password })
    });
    return response.json();
}

export default function Login({ onLogin }: { onLogin: () => void }) {
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetchUserData(id, password);
            console.log('response',response);
            console.log('response',response.data);

            if (response.success === true && response.time === 86400000) {
                localStorage.removeItem("connected");
                localStorage.removeItem("user");

                localStorage.setItem("connected", "true");
                localStorage.setItem("user", JSON.stringify(response.data));
                onLogin();
            } else {
                setError('Connexion échouée 1 : ' + (response.message || 'Erreur inconnue'));
                setId('');
                setPassword('');
            }
        } catch (err) {
            setError('Connexion échouée 2: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
        } finally {
            setLoading(false);
            setTimeout(() => setError(''), 3000);
        }
    };

    return (
        <div
            className="min-h-screen col align-center justify-center p-xl"
            data-style="neuro"
            data-mode="light"
        >
            <div className="surface col gap-lg" style={{ width: '100%', maxWidth: '26rem' }}>

                <div className="col gap-xs">
                    <h2 className="text-heading text-2xl">Connexion</h2>
                    <p className="text-body text-sm">Entrez vos identifiants pour accéder à votre espace.</p>
                </div>

                <div className="divider" />

                <form
                    onSubmit={handleSubmit}
                    className="col gap-md"
                >
                    <div className="col gap-xs">
                        <label className="text-label">Identifiant</label>
                        <input
                            type="text"
                            placeholder="Votre ID"
                            className="input"
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                            required
                        />
                    </div>

                    <div className="col gap-xs">
                        <label className="text-label">Mot de passe</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <span className="badge badge-danger w-full" style={{ justifyContent: 'center' }}>
                            {error}
                        </span>
                    )}

                    <button
                        type="submit"
                        className={`btn btn-primary w-full justify-center${loading ? ' opacity-75 not-allowed' : ''}`}
                        disabled={loading}
                    >
                        {loading ? 'Connexion en cours…' : 'Se connecter'}
                    </button>
                    <span >
                            Pas encore de compte ? |    <span className="badge badge-danger " style={{ justifyContent: 'center', cursor:'pointer'}} onClick={()=>{navigate('/register')}}>Créer en un</span> 
                        </span>
                </form>
            </div>
        </div>
    );
}