
// url backend here
const backendUrl = 'http://localhost:3000/crud/';

// globale functions here

/*   POSSIBLE FIELDS STRUCTURE 
-- INSERT ONE ROW
    {
        name: 'Alice',
        email: 'alice@example.com',
        role: 'member',
    };
-- INSERT MANY ROWS
    [
        {name: 'Alice',email: 'alice@example.com',role: 'member',},
        {name: 'Bob',email: 'bob@example.com',role: 'member',},
        {name: 'Charlie',email: 'charlie@example.com',role: 'member',}
    ];

// Get the inserted row back
const res = await dbCreate('users', { name: 'Bob', email: 'bob@example.com' }, {
  returning: true,   // adds RETURNING * → fetch = 'one'
});

*/
// create data in any table
async function createDataToTable(table: string, fields: object) {

    const response = await fetch(backendUrl + 'create/' + table, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(fields)
    });
    const data = await response.json();
    return data;
}


// global actions
const user = JSON.parse(localStorage.getItem("user") || "null");
const connected = localStorage.getItem("connected");


// imports
import '../css/form.css'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import { useImmer } from 'use-immer';



const countries = [
  { code: "237", name: "Cameroon" },
  { code: "33", name: "France" },
  { code: "1", name: "USA" },
];

function validatePhone(phone: string) {
  return /^[0-9]{6,15}$/.test(phone);
}

function validateRequired(value: string) {
  return value.trim().length > 0;
}

type onCloseProps = {onclose :(s:boolean) => void}

export default function distributeur({onclose}: onCloseProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!connected || !user) {
      localStorage.removeItem("user");
      localStorage.removeItem("connected");
      navigate("/login");
    }
  }, [connected, user, navigate]);

  const getInitialSeller = () => ({
    id: '', name: '', phone: '', sexe: '',
    upline: '', office: '',
    created_at: Date.now(),
  });

  const [newSeller, setnewSeller] = useImmer(getInitialSeller());
  const resetSeller = () => setnewSeller(getInitialSeller());

  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [showCountries, setShowCountries] = useState(false);
  const [theCnuntry, setTheCountry] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const validate = () => {
    const newErrors: any = {};
    if (!validateRequired(newSeller.id)) newErrors.id = "ID requis";
    if (!validateRequired(newSeller.name)) newErrors.name = "Nom requis";
    if (!validateRequired(newSeller.sexe)) newErrors.sexe = "Sexe requis";
    if (!validateRequired(newSeller.upline)) newErrors.upline = "Upline requis";
    if (!validatePhone(newSeller.phone)) newErrors.phone = "Téléphone invalide";
    if (!validateRequired(newSeller.office)) setnewSeller(dr => { dr.office = user.office });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    setSuccess("");
    setnewSeller(dr => { dr.created_at = Date.now(); dr.phone = theCnuntry + phoneNumber; });
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await createDataToTable('seller', newSeller);
      if (data.success === false) throw new Error(data.message || "Error");
      setSuccess("Distributeur enregistré avec succès");
      resetSeller();
    } catch (err: any) {
      setErrors({ global: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen col align-center justify-center p-xl"
      data-style="neuro"
      data-mode="light"
    >
      <div className="surface col gap-lg" style={{ width: '100%', maxWidth: '32rem' }}>
        <div className="">
          <div className="col gap-xs">
            <h2 className="text-heading text-2xl">Nouveau distributeur</h2>
            <p className="text-body text-sm">Remplissez les informations du distributeur.</p>
          </div>
          <button onClick={()=>{onclose?.(true)}}>back</button>
        </div>

        <div className="divider" />

        {/* ID */}
        <div className="col gap-xs">
          <label className="text-label">Identifiant</label>
          <input className="input" placeholder="ID" value={newSeller.id}
            onChange={(e) => setnewSeller(dr => { dr.id = e.target.value })} />
          {errors.id && <span className="badge badge-danger">{errors.id}</span>}
        </div>

        {/* Name */}
        <div className="col gap-xs">
          <label className="text-label">Nom</label>
          <input className="input" placeholder="Nom complet" value={newSeller.name}
            onChange={(e) => setnewSeller(dr => { dr.name = e.target.value })} />
          {errors.name && <span className="badge badge-danger">{errors.name}</span>}
        </div>

        {/* Sex */}
        <div className="col gap-xs">
          <label className="text-label">Sexe</label>
          <div className="row gap-md">
            <button
              className={`btn w-full justify-center${newSeller.sexe === 'm' ? ' btn-primary' : ''}`}
              onClick={() => setnewSeller(dr => { dr.sexe = 'm' })}
            >
              Homme
            </button>
            <button
              className={`btn w-full justify-center${newSeller.sexe === 'f' ? ' btn-primary' : ''}`}
              onClick={() => setnewSeller(dr => { dr.sexe = 'f' })}
            >
              Femme
            </button>
          </div>
          {errors.sexe && <span className="badge badge-danger">{errors.sexe}</span>}
        </div>

        {/* Phone */}
        <div className="col gap-xs">
          <label className="text-label">Téléphone</label>
          <div className="row gap-sm align-center">
            <div
              className="btn"
              style={{ minWidth: '5rem', justifyContent: 'center' }}
              onClick={() => setShowCountries(!showCountries)}
            >
              {theCnuntry || 'Pays'}
            </div>
            <input
              className="input w-full"
              placeholder="6XX XXX XXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          {showCountries && (
            <div className="surface-inset col gap-xs" style={{ maxHeight: '12rem', overflowY: 'auto' }}>
              {countries.map((c) => (
                <div
                  key={c.code}
                  className="btn btn-ghost text-sm"
                  onClick={() => { setTheCountry(c.code); setShowCountries(false); }}
                >
                  {c.code} {c.name}
                </div>
              ))}
            </div>
          )}
          {errors.phone && <span className="badge badge-danger">{errors.phone}</span>}
        </div>

        {/* Upline */}
        <div className="col gap-xs">
          <label className="text-label">Upline</label>
          <input className="input" placeholder="Upline" value={newSeller.upline}
            onChange={(e) => setnewSeller(dr => { dr.upline = e.target.value })} />
          {errors.upline && <span className="badge badge-danger">{errors.upline}</span>}
        </div>

        {/* Office */}
        <div className="col gap-xs">
          <label className="text-label">Bureau</label>
          <input className="input" placeholder={user.office} value={newSeller.office}
            onChange={(e) => setnewSeller(dr => { dr.office = e.target.value })} />
        </div>

        <div className="divider" />

        {errors.global && (
          <span className="badge badge-danger w-full" style={{ justifyContent: 'center' }}>
            {errors.global}
          </span>
        )}
        {success && (
          <span className="badge badge-success w-full" style={{ justifyContent: 'center' }}>
            {success}
          </span>
        )}

        <button
          className={`btn btn-primary w-full justify-center${loading ? ' opacity-75 not-allowed' : ''}`}
          disabled={loading}
          onClick={handleSubmit}
        >
          {loading ? 'Enregistrement…' : 'Enregistrer le distributeur'}
        </button>

      </div>
    </main>
  );
}