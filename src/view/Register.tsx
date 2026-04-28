import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import '../css/register.css';


const backendUrl = 'https://backend-nana-v2.onrender.com'

async function fetchUserData(id: string, password: string, name: string, phone: string) {
    const response = await fetch(backendUrl+'/owner', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, password, name, phone })
    });
    const data = await response.json();
    return data;
}

export default function FlipForm() {
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const [flipped, setFlipped] = useState(false);
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  

  
  useEffect(() => {
    gsap.to(cardRef.current, {
      rotateY: flipped ? 180 : 0,
      duration: 0.8,
      ease: "power2.inOut",
    });
  }, [flipped]);

  const handleSubmit = async () => {
    if (id.length===0) {
      setError("Veuillez entrer votre id")
      setTimeout(() => setError(''), 2000);
      return
    }
    if (password.length===0) {
      setError("Veuillez entrer votre mot de passe")
      setTimeout(() => setError(''), 2000);
      return
    }
    if (name.length===0) {
      setError("Veuillez entrer votre nome")
      setTimeout(() => setError(''), 2000);
      return
    }
    if (phone.length < 9) {
      setError("numero non valide exemple : 237655555555")
      setTimeout(() => setError(''), 2000);
      return
    }
    
    
    setLoading(true);
    setError('');
    try {
      const response = await fetchUserData(id, password, name, phone);
      if (response.success === true) {
        localStorage.setItem("connected", "true");
        localStorage.setItem("user", JSON.stringify(response.data));
        navigate('/app');
      } else {
        
        setError(response.message);
      }
    } catch (err) {
      setError('Création échouée : ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    } finally {
      setLoading(false);
      setId('');
      setPassword('');
      setTimeout(() => setError(''), 2000);
    }
  };

  return (
    <div
      className="min-h-screen col align-center justify-center p-xl"
      data-style="neuro"
      data-mode="light"
    >
      <div className="cardContainer" style={{ perspective: '1000px' }}>
        <div ref={cardRef} className="card" style={{ transformStyle: 'preserve-3d', position: 'relative' }}>

          {/* FRONT */}
          <div className="face front surface col gap-lg" style={{ backfaceVisibility: 'hidden', width: '100%', maxWidth: '26rem' }}>
            <div className="col gap-xs">
              <h2 className="text-heading text-2xl">Connexion</h2>
              <p className="text-body text-sm">Entrez vos identifiants.</p>
            </div>

            <div className="divider" />

            <div className="col gap-xs">
              <label className="text-label">Identifiant</label>
              <input
                type="text"
                placeholder="Votre ID"
                className="input"
                value={id}
                onChange={(e) => setId(e.target.value)}
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
              />
            </div>

            <button
              onClick={() => setFlipped(true)}
              className="btn btn-primary w-full justify-center"
            >
              Suivant →
            </button>
          </div>

          {/* BACK */}
          <div
            className="face back surface col gap-md"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', width: '100%', maxWidth: '26rem', position: 'absolute', top: 0, left: 0 }}
          >
            <div className="col gap-xs">
              <h2 className="text-heading text-2xl">Profil</h2>
              <p className="text-body text-sm">Complétez vos informations.</p>
            </div>

            <div className="divider" />

            <div className="col gap-xs">
              <label className="text-label">Nom</label>
              <input
                type="text"
                placeholder="Votre nom"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="col gap-xs">
              <label className="text-label">Téléphone</label>
              <input
                type="tel"
                placeholder="+237 6XX XXX XXX"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {error && (
              <span className="badge badge-danger w-full" style={{ justifyContent: 'center' }}>
                {error}
              </span>
            )}

            <div className="row gap-sm" style={{height:'3rem'}}>
              <button
                onClick={() => setFlipped(false)}
                className="btn btn-ghost"
              >
                ← Retour
              </button>
              <button
                onClick={handleSubmit}
                className={`btn btn-primary w-full justify-center${loading ? ' opacity-75 not-allowed' : ''}`}
                disabled={loading}
              >
                {loading ? 'En cours…' : 'Soumettre'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}