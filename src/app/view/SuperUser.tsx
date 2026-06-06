// offices,  managers, charge, cashout, goals
// about charge, a l'ouverture de cet onglet le programme verifie la date pour voir si nous ne somme pas a un nouveau mois et reconduit  les charges pour ca je peux creer une table last connection
//const [vue, setvue] = useState("office-manager")
// ---------------------------------------

// url backend here
const backendUrl = 'https://backend-nana-v2-production.up.railway.app';
//const backendUrl = 'http://localhost:3000';

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

// create data in any table
async function createManagerl(fields: object) {

    const response = await fetch(backendUrl + '/manager/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(fields)
    });
    const data = await response.json();
    return data;
}

async function initStock(fields: object) {

    const response = await fetch(backendUrl + '/stock/init/',  {
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
const getDataFromTableWithConstraints = async (table:string, body:object) => {
    const res = await fetch(backendUrl +  '/crud/getwith/' + table, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log(data);
    return data
};


/*   POSSIBLE FIELDS STRUCTURE 

no fields, no constraints

*/

//get data without any contraints
/*
const getDataWithoutConstraints = async (table:string) => {
    const res = await fetch(backendUrl + 'get/' + table, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    });

    const data = await res.json();
    console.log(data);
    return data
};
*/

/*   POSSIBLE FIELDS STRUCTURE 
-- Update by id  { id: 42 } or { id: 7, active: true }(complex where)     // WHERE -- to set in body 

   { 
        set : { role: 'admin' },
        where : { id: 42 } 
    } 

-- Multiple SET fields + complex WHERE

    { 
        set : { price: 19.99, updated_at: new Date() },
        where : { id: 42 } 
    } 

  
// Get updated rows back

    { 
        set : { price: 19.99, updated_at: new Date() },
        where : { id: 42 },
        returning: true 
    }

*/
//update data in any table
async function updateDataToTable(table: string, fields: object) {

    const response = await fetch(backendUrl + '/crud/update/' + table, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(fields)
    });
    const data = await response.json();
    return data;
}

/*   POSSIBLE FIELDS STRUCTURE 
-- Delete by id
    { 
        contraints : {id: 99},
        returning: false   // or true
    };

// Delete with operator
    {
        contraints : {created_at: { op: '<', value: '2024-01-01' }},
        returning: false   // or true
    };

*/
/*delete data
async function deleteDataFromTable(table:string, fields: object) {
    const response = await fetch(backendUrl + '/crud/delete/' + table, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(fields)
    });
    const data = await response.json();
    return data;
}

*/




// imports
import '../css/sudo.css'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import { useImmer } from 'use-immer';


// main function
export default function sudo(){

    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const connected = localStorage.getItem("connected");
    // Redirect
    useEffect(() => {
    if (!connected || !user) {
        localStorage.removeItem("user");
        localStorage.removeItem("connected");
        navigate("/login");
    }
    }, [connected, user, navigate]);

    // FLOW --- > opening [] -> set view ; react[setview] -> fetch related data : office-manager view (when office able, set first item as selected office, [selectedoffice]-> get managers...), charge-goal view(fetch charge, cashout and goals, display and manage)

    // TYPES
    type Office = {
        id: number;
        name: string
    };

    type manager = {
        id: string;
        name: string;
        owner: boolean;
        phone: string;
        office : string;
        role : string;
        password : string;
        promoted_by : string
    };

   

    // ---- END COMPLEMENTED TYPES ----

    // STATES AND VARIABLES
    const [vue, setVue] = useState('office-manager')
    // --view office states
    const [officeListe, setofficeListe] = useImmer<Office[]>([]);
    const [curentOffice, setcurentOffice] = useState('');
    const [newOfficeName, setnewOfficeName] = useState('');
    const [showNewOfficeForm, setShowOfficeForm] = useState(false);
    const [managerListe, setmanagerListe] = useImmer<manager[]>([]);
    const [showNewmanagerForm, setShowmanagerForm] = useState(false);

    // COMPLEMENTED: showModifManagerForm is now per-manager (tracks which manager id has the form open)
    const [modifManagerOpenId, setModifManagerOpenId] = useState<string | null>(null);

    const getInitialManager = () => ({
        id: '',
        name: '',
        phone: '',
        password: '',
        owner: false,
        role: 'manager',
        office: '',
        promoted_by : '',
        created_at: 'now()',
    });

    const [newManager, setnewManager] = useImmer(getInitialManager());

    const resetManager = () => {
    setnewManager(getInitialManager());
    };

    const getInitialmodifyManager = () => ({
    name: '',
    phone: '',
    password: '',
    role : 'manager'
    });

    const [modifyfManagerInfo, setmodifyManagerInfo] = useImmer(getInitialmodifyManager());

    const resetmodifyManagerinfo = () => {
    setmodifyManagerInfo(getInitialmodifyManager());
    };

    const [officeManagerVisibility, setOMVisibility] = useImmer({
        emptyOffice : true,
        emptyManager : true,
        thereIsOffice : false,
        thereIsManager : false,
        
    })



    // ---- END COMPLEMENTED charge-goal states ----

    // loading animation state  // should have loading components
    const [isLoading, setLoading] = useImmer({
        fetchOffice : false,
        fetchManager : false,
        createOffice : false,
        createManager : false,
        UpdateManager : false,
        global : false,
        // COMPLEMENTED
        fetchGoal: false,
        fetchCharge: false,
        fetchCashout: false,
    })

    // is operating
    const [isOperating, setOperating] = useImmer({
        fetchOffice : false,
        fetchManager : false,
        createOffice : false,
        createManager : false,
        UpdateManager : false,
        // COMPLEMENTED
        createGoal: false,
        createCharge: false,
        createCashout: false,
        updateGoal: false,
        updateCharge: false,
        updateCashout: false,
        deleteOffice: false,
        deleteManager: false,
        deleteGoal: false,
        deleteCharge: false,
        deleteCashout: false,
    })
    // error handling  // should have toast component
    const [error, setError] = useState('')

    // COMPLEMENTED: auto-clear error after 4 seconds
    useEffect(() => {
        if (error !== '') {
            const timer = setTimeout(() => setError(''), 4000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    // support functions 
    function handleView(name:string){
        if (vue === name) {
            return true
        }
        return false
    };

    

    // creation functions
    async function createOffice() {
        if (isOperating.createOffice === true) {
            return
        }

        setOperating(dr=>{dr.createOffice = true})
        setLoading(dr=>{dr.global = true})
        
        const body = {
            name: newOfficeName,
            owner: user.owner ? user.id :user.promoted_by,
        };
        console.log(body)
        
        try {
            const response = await createDataToTable("office", body);
            
            //handling (add to list, if error)
            if (response.success === true) {
                setofficeListe(dr=>{dr.push({ id: response.id, name:newOfficeName})})
                //init stock
                const isinit = await initStock({office : newOfficeName})
                if(!isinit.success){
                    setError('Initialisation du stock echoue')
                }
                // COMPLEMENTED: update visibility after successful creation
                setOMVisibility(dr=>{
                    dr.thereIsOffice = true
                    dr.emptyOffice = false
                })

            }else{
                //error handling
                setError('Un proble serveur est survenu')
            }
            
            
        } catch (error) {
            // error
            setError('Un proble de connection est survenu')
        }finally{
            setnewOfficeName('')
            setShowOfficeForm(false)
            setOperating(dr=>{dr.createOffice = false})
            setLoading(dr=>{dr.global = false})
        }
    }

    async function createManager() {

        if (isOperating.createManager === true) {
            return
        }

        setOperating(dr=>{dr.createManager = true})
        setLoading(dr=>{dr.global = true})

        // COMPLEMENTED: build body directly instead of relying on immer async state update
        const body = {
            ...newManager,
            office: curentOffice,
            promoted_by: user.owner ? user.id : user.promoted_by
        };
        
        try {
            const response = await createManagerl(body);
            console.log(response)
            //handling (add to list, if error)
            if (response.success === true) {
                setmanagerListe(dr=>{dr.push({
                    id: body.id,
                    name: body.name,
                    phone: body.phone,
                    office: body.office,
                    role: body.role,
                    password: body.password,
                    promoted_by: body.promoted_by,
                    owner: body.owner
                })})
            }else{
                //error handling
                setError('Un proble serveur est survenu 1')
            }
            
        } catch (error) {
            setError('Un proble de connection est survenu 2');

        }finally{
            resetManager()
            setShowmanagerForm(false)
            setOperating(dr=>{dr.createManager = false})
            setLoading(dr=>{dr.global = false})
        }
    }

    // modification functions
    async function modifyManager(id:string) {
        if (isOperating.UpdateManager === true) return;
        setOperating(dr=>{ dr.UpdateManager = true })
        setLoading(dr=>{ dr.global = true })

        const body = { 
            set : modifyfManagerInfo,
            where : { id: id } 
        }
        try {
            const response = await updateDataToTable("manager", body);
            // COMPLEMENTED: update manager in list on success
            if (response.success === true) {
                setmanagerListe(draft => {
                    const target = draft.find(m => m.id === id);
                    if (target) {
                        if (modifyfManagerInfo.name)     target.name     = modifyfManagerInfo.name;
                        if (modifyfManagerInfo.phone)    target.phone    = modifyfManagerInfo.phone;
                        if (modifyfManagerInfo.password) target.password = modifyfManagerInfo.password;
                        if (modifyfManagerInfo.role)     target.role     = modifyfManagerInfo.role;
                    }
                });
                setModifManagerOpenId(null);
            } else {
                setError('Un probleme serveur est survenu');
            }
            console.log(response)
        } catch (error) {
            setError('Un proble de connection est survenu');
        }finally{
            resetmodifyManagerinfo()
            setOperating(dr=>{ dr.UpdateManager = false })
            setLoading(dr=>{ dr.global = false })
        }
    }

    // deletion functions
    async function deleteOffice(id:number) {
        if (isOperating.deleteOffice === true) return;
        setOperating(dr=>{ dr.deleteOffice = true })
        setLoading(dr=>{ dr.global = true })

        const body = { 
            set : {is_deleted : true},
            where : { id: id }
        }
        try {
            const response = await updateDataToTable("office", body);
            // COMPLEMENTED: remove from list on success
            if (response.success === true) {
                setofficeListe(draft => {
                    const idx = draft.findIndex(o => o.id === id);
                    if (idx !== -1) draft.splice(idx, 1);
                });
                // COMPLEMENTED: if deleted office was current, reset to first or empty
                if (officeListe.length > 1) {
                    const remaining = officeListe.filter(o => o.id !== id);
                    setcurentOffice(remaining[0]?.name ?? '');
                } else {
                    setcurentOffice('');
                    setOMVisibility(dr=>{ dr.emptyOffice = true; dr.thereIsOffice = false });
                }
            } else {
                setError('Un probleme serveur est survenu');
            }
            console.log(response)
        } catch (error) {
            setError('Un proble de connection est survenu');
        }finally{
            setOperating(dr=>{ dr.deleteOffice = false })
            setLoading(dr=>{ dr.global = false })
        }
    }

    async function deleteManager(id:string) {
        if (isOperating.deleteManager === true) return;
        setOperating(dr=>{ dr.deleteManager = true })
        setLoading(dr=>{ dr.global = true })

        const body = { 
            set : {is_deleted : true},
            where : { id: id }
        }
        try {
            const response = await updateDataToTable("manager", body);
            // COMPLEMENTED: remove from list on success
            if (response.success === true) {
                setmanagerListe(draft => {
                    const idx = draft.findIndex(m => m.id === id);
                    if (idx !== -1) draft.splice(idx, 1);
                });
            } else {
                setError('Un probleme serveur est survenu');
            }
            console.log(response)
        } catch (error) {
            setError('Un proble de connection est survenu');
        }finally{
            setOperating(dr=>{ dr.deleteManager = false })
            setLoading(dr=>{ dr.global = false })
        }
    }


    // flow ...
    useEffect(()=>{
        setVue('office-manager');

    },[])

    useEffect(()=>{
        if (vue === 'office-manager') {
            // fetch office first
            
            setOMVisibility(draft=>{
                draft.emptyOffice = false
                draft.thereIsOffice = false
            });
            setLoading(draft=>{
                draft.fetchOffice = true
            });

            const field = {
                fields: ['id', 'name'],
                constraints: { owner: user.promoted_by, is_deleted: false }
            };
            console.log(user.promoted_by)
            const fetchdata = async ()=>{
                try {
                    const data = await getDataFromTableWithConstraints('office', field)
                    console.log(data)
                    if (data.success === true) {
                        const offices = data.list;
                        console.log(offices)

                        // COMPLEMENTED: check fetched offices array, not existing state
                        if (offices.length > 0) {
                            setofficeListe(draft =>{
                                draft.push(...offices)
                            })
                        
                            setLoading(draft=>{
                                draft.fetchOffice = false
                            });
                            setOMVisibility(draft=>{
                                draft.thereIsOffice = true
                                draft.emptyOffice = false
                                
                            })
                        }else{
                            setLoading(draft=>{
                                draft.fetchOffice = false
                            });
                            setOMVisibility(draft=>{
                                draft.emptyOffice = true
                                draft.thereIsOffice = false
                            });
                        }
                    }else{
                        setLoading(draft=>{
                            draft.fetchOffice = false
                        });
                        setOMVisibility(draft=>{
                            draft.emptyOffice = true
                            draft.thereIsOffice = false
                        });
                        // error handling
                        setError('Un proble est survenu')
                    }
                } catch (error) {
                    setLoading(draft=>{
                        draft.fetchOffice = false
                    });
                    setOMVisibility(draft=>{
                        draft.emptyOffice = true
                        draft.thereIsOffice = false
                    });
                    // error handling
                    setError('Un proble est survenu')
                }
                
                
            }

            fetchdata();
            
        }

       

            
        

    },[vue])

    useEffect(()=>{
        if (curentOffice === '' && officeListe.length > 0) {
            setcurentOffice(officeListe[0].name)
            setOMVisibility(dr=>{
                dr.thereIsOffice = true
                dr.emptyOffice = false
            })
        }

        // COMPLEMENTED: fixed inverted condition — check officeListe not managerListe
        if (officeListe.length <= 0) {
            setOMVisibility(dr=>{
                dr.thereIsOffice = false
                dr.emptyOffice = true
            })
        }
    },[officeListe])

    useEffect(()=>{
        if (managerListe.length > 0) {
            setOMVisibility(dr=>{
                dr.thereIsManager = true
                dr.emptyManager = false
            })
        }

        if (managerListe.length <= 0) {
            setOMVisibility(dr=>{
                dr.thereIsManager = false
                dr.emptyManager = true
            })
        }
    },[managerListe])

    useEffect(()=>{
        if (curentOffice === '') return;

        const field = {
                fields: ['id', 'name', 'phone', 'office', 'role', 'promoted_by'],
                constraints: { is_deleted: false, promoted_by: user.promoted_by },
                or: [
                    { office: curentOffice },
                    {office: '*'}
                ]
        };

        setOMVisibility(draft=>{
            draft.emptyManager = false
            draft.thereIsManager = false
        });
        setLoading(draft=>{
                draft.fetchManager = true
        });

        // COMPLEMENTED: clear old manager list when switching office
        setmanagerListe(()=>[]);

        const fetchdata = async ()=>{
            try {
                const data = await getDataFromTableWithConstraints('manager', field)
                if (data.success === true) {
                    const managers = data.list
                    
                    // COMPLEMENTED: check fetched managers array, not existing state
                    if (managers.length > 0) {

                        setmanagerListe(draft=>{
                            draft.push(...managers);
                        })

                        setLoading(draft=>{
                            draft.fetchManager = false
                        });
                        setOMVisibility(draft=>{
                            draft.thereIsManager = true
                            draft.emptyManager = false
                            
                        })
                    }else{
                        setLoading(draft=>{
                            draft.fetchManager = false
                        });
                        setOMVisibility(draft=>{
                            draft.emptyManager = true
                            draft.thereIsManager = false
                        });
                    }
                    
                }else{
                    setLoading(draft=>{
                        draft.fetchManager = false
                    });
                    setOMVisibility(draft=>{
                        draft.emptyManager = true
                        draft.thereIsManager = false
                    });
                    // error handling
                    setError('Un proble est survenu');
                }
            } catch (error) {
                setLoading(draft=>{
                    draft.fetchManager = false
                });
                setOMVisibility(draft=>{
                    draft.emptyManager = true
                    draft.thereIsManager = false
                });
                // error handling
                setError('Un proble est survenu')
            }
           
            
        }

        fetchdata(); 

    },[curentOffice]);

    

// end flow ...

/*when role will be able 
<select  name="officeselction" id="officeselction">
    {officeListe.map((office)=>(<p key={office.id}>{office.name}</p>))}
</select>
<input value={newManager.office} onChange={(e)=>{setnewManager(draft=>{draft.office = e.target.value})}} type="text" placeholder='office  a remplacer par un select' />  
<div className="role">
    auto role
</div>
*/


    // ... (all logic/state/functions unchanged) ...

    return (
        <main
            className="main"
            data-style="neuro"
            data-mode="light"
            
        >
            {/* GLOBAL LOADING */}
            {isLoading.global && (
                <div className="row align-center justify-center gap-sm p-md">
                    <span className="badge badge-neutral">Chargement…</span>
                </div>
            )}

            {/* ERROR TOAST */}
            {error && (
                <div
                    className="row align-center justify-center"
                    style={{ position: 'fixed', bottom: '4rem', left: '60%', transform: 'translateX(-50%)', zIndex: 800 }}
                >
                    <span className="badge badge-danger">{error}</span>
                </div>
            )}

            {/* ── OFFICE-MANAGER VIEW ── */}
            {handleView('office-manager') && (
                <div className=" office-manager">

                    {/* OFFICES PANEL */}
                    <div className="office-panel surface col gap-md" style={{ flex: '1 1 18rem' }}>
                        <div className="row align-center justify-between">
                            <h3 className="text-heading text-xl">Bureaux</h3>
                            <button
                                className="btn btn-ghost"
                                onClick={() => setShowOfficeForm(!showNewOfficeForm)}
                                title="Nouveau bureau"
                            >
                                {showNewOfficeForm ? '✕' : '＋'}
                            </button>
                        </div>

                        {/* New Office Form */}
                        {showNewOfficeForm && (
                            <div className="surface-inset col gap-md">
                                <label className="text-label">Nom du bureau</label>
                                <input
                                    className="input"
                                    type="text"
                                    placeholder="Ex: Bureau Douala"
                                    value={newOfficeName}
                                    onChange={(e) => setnewOfficeName(e.target.value)}
                                />
                                <button
                                    className="btn btn-primary w-full justify-center"
                                    onClick={() => createOffice()}
                                >
                                    Créer
                                </button>
                            </div>
                        )}

                        <div className="divider" />

                        {/* Office List */}
                        {isLoading.fetchOffice && <span className="badge badge-neutral">Chargement…</span>}

                        {officeManagerVisibility.emptyOffice && (
                            <p className="text-body text-sm">Aucun bureau trouvé.</p>
                        )}

                        {officeManagerVisibility.thereIsOffice && (
                            <div className="office-list col gap-sm">
                                {officeListe.map((office) => (
                                    <div
                                        key={office.id}
                                        className={`surface-${curentOffice === office.name ? 'inset' : 'raised'} row align-center justify-between pointer`}
                                        onClick={() => setcurentOffice(office.name)}
                                    >
                                        <span className={`text-body weight-medium${curentOffice === office.name ? ' text-brand' : ''}`}>
                                            {office.name}
                                        </span>
                                        <button
                                            className="btn btn-ghost text-danger text-sm"
                                            onClick={(e) => { e.stopPropagation(); deleteOffice(office.id); }}
                                            title="Supprimer"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* MANAGERS PANEL */}
                    <div className="manager-panel surface col gap-lg" style={{ flex: '2 1 24rem' }}>
                        <div className="row align-center justify-between">
                            <h3 className="text-heading text-xl">Managers — {curentOffice}</h3>
                            <button
                                className="btn btn-ghost"
                                onClick={() => setShowmanagerForm(!showNewmanagerForm)}
                                title="Nouveau manager"
                            >
                                {showNewmanagerForm ? '✕' : '＋'}
                            </button>
                        </div>

                        {/* New Manager Form */}
                        {showNewmanagerForm && (
                            <div className="new-manager surface-inset col gap-md">
                                <p className="text-label">Créer un manager</p>
                                <div className="col gap-xs">
                                    <label className="text-label">Identifiant</label>
                                    <input className="input" type="text" placeholder="ID"
                                        value={newManager.id}
                                        onChange={(e) => setnewManager(draft => { draft.id = e.target.value })} />
                                </div>
                                <div className="col gap-xs">
                                    <label className="text-label">Mot de passe</label>
                                    <input className="input" type="text" placeholder="Mot de passe"
                                        value={newManager.password}
                                        onChange={(e) => setnewManager(draft => { draft.password = e.target.value })} />
                                </div>
                                <div className="col gap-xs">
                                    <label className="text-label">Nom</label>
                                    <input className="input" type="text" placeholder="Nom complet"
                                        value={newManager.name}
                                        onChange={(e) => setnewManager(draft => { draft.name = e.target.value })} />
                                </div>
                                <div className="col gap-xs">
                                    <label className="text-label">Téléphone</label>
                                    <input className="input" type="text" placeholder="Téléphone"
                                        value={newManager.phone}
                                        onChange={(e) => setnewManager(draft => { draft.phone = e.target.value })} />
                                </div>
                                <div className="col gap-xs">
                                    <label className="text-label">Rôle</label>
                                    <select
                                        className="input"
                                        value={newManager.role}
                                        onChange={(e) => setnewManager(draft => { draft.role = e.target.value })}
                                    >
                                        <option value="manager">Manager</option>
                                        <option value="superuser">Superuser</option>
                                    </select>
                                </div>
                                <button
                                    className="btn btn-primary w-full justify-center"
                                    onClick={() => createManager()}
                                >
                                    Créer le manager
                                </button>
                            </div>
                        )}

                        <div className="divider" />

                        {/* Manager List */}
                        {isLoading.fetchManager && <span className="badge badge-neutral">Chargement…</span>}

                        {officeManagerVisibility.emptyManager && (
                            <p className="text-body text-sm">Aucun manager dans ce bureau.</p>
                        )}

                        {officeManagerVisibility.thereIsManager && (
                            <div className="manager-list col gap-md">
                                {managerListe.map((manager) => (
                                    <div key={manager.id} className="surface-inset col gap-sm">

                                        {/* Manager Header */}
                                        <div className="row align-center justify-between">
                                            <div className="col gap-xs">
                                                <span className="text-body weight-semibold">{manager.name}</span>
                                                <span className="badge badge-brand">{manager.role}</span>
                                            </div>
                                            <div className="row gap-sm">
                                                <button
                                                    className="btn btn-ghost text-sm"
                                                    onClick={() => {
                                                        setModifManagerOpenId(modifManagerOpenId === manager.id ? null : manager.id);
                                                        resetmodifyManagerinfo();
                                                    }}
                                                    title="Modifier"
                                                >
                                                    ✎
                                                </button>
                                                <button
                                                    className="btn btn-ghost text-danger text-sm"
                                                    onClick={() => deleteManager(manager.id)}
                                                    title="Supprimer"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>

                                        {/* Modify Form */}
                                        {modifManagerOpenId === manager.id && (
                                            <div className="col gap-sm">
                                                <div className="divider" />
                                                <div className="col gap-xs">
                                                    <label className="text-label">Mot de passe</label>
                                                    <input className="input" type="text"
                                                        placeholder='Nouveau mot de passe'
                                                        value={modifyfManagerInfo.password}
                                                        onChange={(e) => setmodifyManagerInfo(draft => { draft.password = e.target.value })} />
                                                </div>
                                                <div className="col gap-xs">
                                                    <label className="text-label">Nom</label>
                                                    <input className="input" type="text"
                                                        placeholder={manager.name}
                                                        value={modifyfManagerInfo.name}
                                                        onChange={(e) => setmodifyManagerInfo(draft => { draft.name = e.target.value })} />
                                                </div>
                                                <div className="col gap-xs">
                                                    <label className="text-label">Téléphone</label>
                                                    <input className="input" type="text"
                                                        placeholder={manager.phone}
                                                        value={modifyfManagerInfo.phone}
                                                        onChange={(e) => setmodifyManagerInfo(draft => { draft.phone = e.target.value })} />
                                                </div>
                                                <div className="col gap-xs">
                                                    <label className="text-label">Rôle</label>
                                                    <select className="input"
                                                        value={modifyfManagerInfo.role}
                                                        onChange={(e) => setmodifyManagerInfo(draft => { draft.role = e.target.value })}
                                                    >
                                                        <option value="manager">Manager</option>
                                                        <option value="superuser">Superuser</option>
                                                    </select>
                                                </div>
                                                <button
                                                    className="btn btn-primary w-full justify-center"
                                                    onClick={() => modifyManager(manager.id)}
                                                >
                                                    Enregistrer les modifications
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            )}
        </main>
    );
}
