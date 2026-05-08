
// url backend here
const backendUrl = 'https://backend-nana-v2.onrender.com';

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

    const response = await fetch(backendUrl + '/crud/create/' + table, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(fields)
    });
    const data = await response.json();
    return data;
}

/*   POSSIBLE FIELDS STRUCTURE 

-- Filtered + specific columns
    {
    fields: ['id', 'email', 'role'],
    constraints: { role: 'admin', deleted_at: null },
    };

-- Single row
    {
        fields: ['id', 'email', 'role'],
        constraints: { id: 42 },
        fetch: 'one',
    };

-- With ordering + pagination
    {
    constraints: { active: true },
    orderBy: { created_at: 'DESC' },   // or a string / string[]
    limit: 20,
    offset: 40,
    };

-- Advanced operator
    {
    constraints: { total: { op: '>', value: 500 } },
    fetch: 'all',
    };
*/
//get data with contraints
/*const getDataFromTableWithConstraints = async (table:string, body:object) => {
    const res = await fetch(backendUrl +  'getwith/' + table, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log(data);
    return data
};
*/

/* TAGS FOR LATER

{Tags }
        <div className="col gap-sm">
          <label className="text-label">Tags maladie</label>

          {Added tags }
          <div className="surface-inset" style={{ minHeight: '3rem', padding: '0.5rem' }}>
            {!tagAdded
              ? <p className="text-body text-sm">Aucun tag ajouté</p>
              : <div className="row wrap gap-xs">
                  {newClient.tags.map((t, i) => (
                    <span
                      key={i}
                      className="badge badge-brand pointer"
                      onClick={() => setnewClient(dr => { dr.tags.splice(i, 1) })}
                    >
                      {t} ✕
                    </span>
                  ))}
                </div>
            }
          </div>

          { Available tags }
          
        </div>
<div className="row wrap gap-xs">
            {!TagAvaileble
              ? <p className="text-body text-sm">Aucun tag disponible</p>
              : tag.tags.map((t, i) => (
                  <span
                    key={i}
                    className="badge badge-neutral pointer"
                    onClick={() => setnewClient(dr => { dr.tags.push(t) })}
                  >
                    {t}
                  </span>
                ))
            }
          </div>
*/
// global actions



// imports
import '../css/form.css'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import { useImmer } from 'use-immer';
import OfficeSelector from './Office-selector';


const countries = [
  // Afrique de l’Ouest
  { code: "229", name: "Bénin" },
  { code: "226", name: "Burkina Faso" },
  { code: "238", name: "Cap-Vert" },
  { code: "225", name: "Côte d’Ivoire" },
  { code: "220", name: "Gambie" },
  { code: "233", name: "Ghana" },
  { code: "224", name: "Guinée" },
  { code: "245", name: "Guinée-Bissau" },
  { code: "231", name: "Libéria" },
  { code: "223", name: "Mali" },
  { code: "222", name: "Mauritanie" },
  { code: "227", name: "Niger" },
  { code: "234", name: "Nigeria" },
  { code: "221", name: "Sénégal" },
  { code: "232", name: "Sierra Leone" },
  { code: "228", name: "Togo" },

  // Afrique centrale
  { code: "244", name: "Angola" },
  { code: "237", name: "Cameroun" },
  { code: "236", name: "République centrafricaine" },
  { code: "235", name: "Tchad" },
  { code: "243", name: "République démocratique du Congo" },
  { code: "242", name: "République du Congo" },
  { code: "240", name: "Guinée équatoriale" },
  { code: "241", name: "Gabon" },
  { code: "239", name: "Sao Tomé-et-Principe" },

  // Optionnel (Afrique centrale élargie)
  { code: "250", name: "Rwanda" },
  { code: "257", name: "Burundi" },
];



function validateRequired(value: string) {
  return value.trim().length > 0;
}

type onCloseProps = {onclose :(s:boolean) => void}

export default function client({onclose}: onCloseProps) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const connected = localStorage.getItem("connected");

  useEffect(() => {
    if (!connected || !user) {
      localStorage.removeItem("user");
      localStorage.removeItem("connected");
      navigate("/login");
    }
  }, [connected, user, navigate]);

  /*useEffect(() => {
    const field = { fields: ['nom'] };
    const getTags = async () => {
      const data = await getDataFromTableWithConstraints('tags', field);
      if (data.success === false) throw new Error(data.message || "Error");
      if (data.list.length > 0) {
        setTag(dr => { dr.tags.push(...data.list) });
      }
    };
    try { getTags(); } catch (error) {
      throw new Error("Impossible de récupérer les tags maladie");
    }
  }, []);*/
//tags: [] as string[],
  const getInitialClient = () => ({
     name: '', phone: '', sexe: '',
     office: '', age: "",
    seller: "", 
    created_at: 'now()',
  });

  const [newClient, setnewClient] = useImmer(getInitialClient());
  const resetClient = () => setnewClient(getInitialClient());
  const [selectedOffice, setSelectedOffice] = useState('');

  /*const [tag, setTag] = useImmer({
    tags: ["disbet", "palu", "faiblesse sexuelle"] as string[]
  });*/

  //const TagAvaileble = tag.tags.length > 0;
  //const tagAdded = newClient.tags.length > 0;

  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [showCountries, setShowCountries] = useState(false);
  const [theCnuntry, setTheCountry] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const validate = () => {
    const newErrors: any = {};
    
    if (!validateRequired(newClient.seller)) setnewClient(dr => { dr.seller = user.promoted_by });
    if(phoneNumber.length  <= 8 || isNaN(Number(phoneNumber))) newErrors.phone = "Numéro de téléphone invalide";
    if (!validateRequired(newClient.office)) setnewClient(dr => { dr.office = user.owner ? selectedOffice : user.office; });
    if (!newClient.age || isNaN(Number(newClient.age))) newErrors.age = "Âge invalide";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const showOfficeSelector =
        user?.role === 'superuser' || user?.owner === true;

  
  
    const handleSubmit = async () => {
    setSuccess("");
    setnewClient(dr => { dr.phone = theCnuntry + phoneNumber;  });
    if (!validate()) return;
    setLoading(true);
    try {
      const newclientobjet = {
        age: newClient.age,
        created_at:"now()",
        name: newClient.name,
        office: user.owner || user.role === 'superuser'? selectedOffice:user.office,
        phone: theCnuntry + phoneNumber,
        seller: !newClient.seller? user.promoted_by: newClient.seller,
        sexe: newClient.sexe
      }
      const data = await createDataToTable('client', newclientobjet);
      if (data.success === false) throw new Error(data.message || "Error");
      setSuccess("Client enregistré avec succès");
      resetClient();
      setPhoneNumber('');
      setTheCountry('');
    } catch (err: any) {
      setErrors({ global: err.message });
    } finally {
      setLoading(false);
      setTimeout(() => setErrors({}), 3000);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  

  return (
    <main
      className=" col align-center justify-center"
      data-style="neuro"
      data-mode="light"
      style={{width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <div className="surface col gap-lg" style={{ width: '100%', height:'100%' }}>
        <div className="row align-center justify-between">
          <div className="col gap-xs">
            <h2 className="text-heading text-2xl">Nouveau client</h2>
            <p className="text-body text-sm">Remplissez les informations du client.</p>
          </div>
          {showOfficeSelector && (
              <OfficeSelector
                  onOfficeSelect={(officeName) => {
                      // FIX: no comma operator; two proper statements
                      setSelectedOffice(officeName);
                      console.log('selected office', officeName);
                  }}
              />
          )}
          <button className='btn' onClick={()=>{onclose?.(true)}}>back</button>
        </div>

        <div className="divider" />

        
        <div className="form-field"
        style={{overflow:'auto', padding:'0.3rem'}}
        
        >
          {/* Name */}
          <div className="col gap-xs">
            <label className="text-label">Nom</label>
            <input className="input" placeholder="Nom complet" value={newClient.name}
              onChange={(e) => setnewClient(dr => { dr.name = e.target.value })} />
            {errors.name && <span className="badge badge-danger">{errors.name}</span>}
          </div>

          {/* Sex */}
          <div className="col gap-xs">
            <label className="text-label">Sexe</label>
            <div className="row gap-md">
              <button
                className={`btn w-full justify-center${newClient.sexe === 'm' ? ' btn-primary' : ''}`}
                onClick={() => setnewClient(dr => { dr.sexe = 'm' })}
              >
                Homme
              </button>
              <button
                className={`btn w-full justify-center${newClient.sexe === 'f' ? ' btn-primary' : ''}`}
                onClick={() => setnewClient(dr => { dr.sexe = 'f' })}
              >
                Femme
              </button>
            </div>
          </div>

          {/* Phone */}
          <div className="col gap-xs">
            <label className="text-label">Téléphone</label>
            <div className="row gap-sm align-center">
              <div
                className="btn"
                style={{ minWidth: '5rem', justifyContent: 'center' , cursor:'pointer'}}
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
                    style={{cursor:'pointer'}}
                  >
                    {c.code} {c.name}
                  </div>
                ))}
              </div>
            )}
            {errors.phone && <span className="badge badge-danger">{errors.phone}</span>}
          </div>

          {/* Age */}
          <div className="col gap-xs">
            <label className="text-label">Âge</label>
            <input className="input" placeholder="Âge" value={newClient.age}
              onChange={(e) => setnewClient(dr => { dr.age = e.target.value })} />
            {errors.age && <span className="badge badge-danger">{errors.age}</span>}
          </div>

          {/* Vendeur */}
          <div className="col gap-xs">
            <label className="text-label">Vendeur</label>
            <input className="input" placeholder="Vendeur" value={newClient.seller}
              onChange={(e) => setnewClient(dr => { dr.seller = e.target.value })} />
          </div>

          {/* Office */}
          <div className="col gap-xs">
            <label className="text-label">Bureau</label>
            <input disabled  className="input"  placeholder={user.owner || user.role === 'superuser' ? selectedOffice : user.office} value={newClient.office}
              onChange={(e) => setnewClient(dr => { dr.office = e.target.value })} />
          </div>
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
          {loading ? 'Enregistrement…' : 'Enregistrer le client'}
        </button>

      </div>
    </main>
  );
}