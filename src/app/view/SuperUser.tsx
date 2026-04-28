// offices,  managers, charge, cashout, goals
// about charge, a l'ouverture de cet onglet le programme verifie la date pour voir si nous ne somme pas a un nouveau mois et reconduit  les charges pour ca je peux creer une table last connection
//const [vue, setvue] = useState("office-manager")
// ---------------------------------------

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
//delete data
async function deleteDataFromTable(table:string, fields: object) {
    const response = await fetch(backendUrl + '/crud/delete/' + table, {
        method: 'DELETE',
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
import '../css/sudo.css'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import { useImmer } from 'use-immer';


// main function
export default function sudo(){

    const navigate = useNavigate()
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

    type response = {
        id : number;
        success : Boolean
    }

    // ---- COMPLEMENTED TYPES ----
    type Goal = {
        id: number;
        name: string;
        target: number;
        current: number;
        office: string;
    };

    type Charge = {
        id: number;
        name: string;
        amount: number;
        type: 'fixe' | 'variable';
        office: string;
    };

    type Cashout = {
        id: number;
        name: string;
        amount: number;
        manager_phone: string;
        date: string;
        office: string;
    };
    // ---- END COMPLEMENTED TYPES ----

    // STATES AND VARIABLES
    const [vue, setVue] = useState('')
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

    // ---- COMPLEMENTED: charge-goal states ----
    const [goalListe, setGoalListe] = useImmer<Goal[]>([]);
    const [chargeListe, setChargeListe] = useImmer<Charge[]>([]);
    const [cashoutListe, setCashoutListe] = useImmer<Cashout[]>([]);

    const [showNewGoalForm, setShowNewGoalForm] = useState(false);
    const [showNewChargeForm, setShowNewChargeForm] = useState(false);
    const [showNewCashoutForm, setShowNewCashoutForm] = useState(false);

    // per-item modify form open ids (same pattern as manager)
    const [modifGoalOpenId, setModifGoalOpenId] = useState<number | null>(null);
    const [modifChargeOpenId, setModifChargeOpenId] = useState<number | null>(null);
    const [modifCashoutOpenId, setModifCashoutOpenId] = useState<number | null>(null);

    const getInitialGoal = () => ({ name: '', target: 0, office: curentOffice });
    const [newGoal, setNewGoal] = useImmer(getInitialGoal());
    const resetGoal = () => setNewGoal(getInitialGoal());

    const getInitialCharge = () => ({ name: '', amount: 0, type: 'fixe' as 'fixe' | 'variable', office: curentOffice });
    const [newCharge, setNewCharge] = useImmer(getInitialCharge());
    const resetCharge = () => setNewCharge(getInitialCharge());

    const getInitialCashout = () => ({ name: '', amount: 0, manager_phone: '', date: '', office: curentOffice });
    const [newCashout, setNewCashout] = useImmer(getInitialCashout());
    const resetCashout = () => setNewCashout(getInitialCashout());

    const getInitialModifyGoal = () => ({ name: '', target: 0 });
    const [modifyGoalInfo, setModifyGoalInfo] = useImmer(getInitialModifyGoal());
    const resetModifyGoal = () => setModifyGoalInfo(getInitialModifyGoal());

    const getInitialModifyCharge = () => ({ name: '', amount: 0 });
    const [modifyChargeInfo, setModifyChargeInfo] = useImmer(getInitialModifyCharge());
    const resetModifyCharge = () => setModifyChargeInfo(getInitialModifyCharge());

    const getInitialModifyCashout = () => ({ name: '', amount: 0 });
    const [modifyCashoutInfo, setModifyCashoutInfo] = useImmer(getInitialModifyCashout());
    const resetModifyCashout = () => setModifyCashoutInfo(getInitialModifyCashout());

    const [chargeGoalVisibility, setChargeGoalVisibility] = useImmer({
        emptyGoal: true,
        thereIsGoal: false,
        emptyCharge: true,
        thereIsCharge: false,
        emptyCashout: true,
        thereIsCashout: false,
    });
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
        
        try {
            const response = await createDataToTable("office", body);
            console.log(response)
            
            //handling (add to list, if error)
            if (response.success === true) {
                setofficeListe(dr=>{dr.push({ id: response.id, name:newOfficeName})})
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
            const response = await createDataToTable("manager", body);
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
            contraints : {id: id},
            returning: false
        }
        try {
            const response = await deleteDataFromTable("office", body);
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
            contraints : {id: id},
            returning: false
        }
        try {
            const response = await deleteDataFromTable("manager", body);
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

    // ---- COMPLEMENTED: goal CRUD functions (same pattern as office/manager) ----
    async function createGoal() {
        if (isOperating.createGoal === true) return;
        setOperating(dr=>{ dr.createGoal = true })
        setLoading(dr=>{ dr.global = true })

        const body = { ...newGoal, office: curentOffice, current: 0 };
        try {
            const response: response = await createDataToTable("goal", body);
            if (response.success === true) {
                setGoalListe(dr=>{ dr.push({ id: response.id, name: body.name, target: body.target, current: 0, office: body.office }) });
                setChargeGoalVisibility(dr=>{ dr.thereIsGoal = true; dr.emptyGoal = false });
            } else {
                setError('Un probleme serveur est survenu');
            }
        } catch (error) {
            setError('Un proble de connection est survenu');
        } finally {
            resetGoal();
            setShowNewGoalForm(false);
            setOperating(dr=>{ dr.createGoal = false })
            setLoading(dr=>{ dr.global = false })
        }
    }

    async function modifyGoal(id: number) {
        if (isOperating.updateGoal === true) return;
        setOperating(dr=>{ dr.updateGoal = true })
        setLoading(dr=>{ dr.global = true })

        const body = { set: modifyGoalInfo, where: { id } };
        try {
            const response = await updateDataToTable("goal", body);
            if (response.success === true) {
                setGoalListe(draft => {
                    const target = draft.find(g => g.id === id);
                    if (target) {
                        if (modifyGoalInfo.name)   target.name   = modifyGoalInfo.name;
                        if (modifyGoalInfo.target)  target.target = modifyGoalInfo.target;
                    }
                });
                setModifGoalOpenId(null);
            } else {
                setError('Un probleme serveur est survenu');
            }
        } catch (error) {
            setError('Un proble de connection est survenu');
        } finally {
            resetModifyGoal();
            setOperating(dr=>{ dr.updateGoal = false })
            setLoading(dr=>{ dr.global = false })
        }
    }

    async function deleteGoal(id: number) {
        if (isOperating.deleteGoal === true) return;
        setOperating(dr=>{ dr.deleteGoal = true })
        setLoading(dr=>{ dr.global = true })

        const body = { contraints: { id }, returning: false };
        try {
            const response = await deleteDataFromTable("goal", body);
            if (response.success === true) {
                setGoalListe(draft => {
                    const idx = draft.findIndex(g => g.id === id);
                    if (idx !== -1) draft.splice(idx, 1);
                });
            } else {
                setError('Un probleme serveur est survenu');
            }
        } catch (error) {
            setError('Un proble de connection est survenu');
        } finally {
            setOperating(dr=>{ dr.deleteGoal = false })
            setLoading(dr=>{ dr.global = false })
        }
    }
    // ---- END COMPLEMENTED goal CRUD ----

    // ---- COMPLEMENTED: charge CRUD functions (same pattern) ----
    async function createCharge() {
        if (isOperating.createCharge === true) return;
        setOperating(dr=>{ dr.createCharge = true })
        setLoading(dr=>{ dr.global = true })

        const body = { ...newCharge, office: curentOffice };
        try {
            const response: response = await createDataToTable("charge", body);
            if (response.success === true) {
                setChargeListe(dr=>{ dr.push({ id: response.id, name: body.name, amount: body.amount, type: body.type, office: body.office }) });
                setChargeGoalVisibility(dr=>{ dr.thereIsCharge = true; dr.emptyCharge = false });
            } else {
                setError('Un probleme serveur est survenu');
            }
        } catch (error) {
            setError('Un proble de connection est survenu');
        } finally {
            resetCharge();
            setShowNewChargeForm(false);
            setOperating(dr=>{ dr.createCharge = false })
            setLoading(dr=>{ dr.global = false })
        }
    }

    async function modifyCharge(id: number) {
        if (isOperating.updateCharge === true) return;
        setOperating(dr=>{ dr.updateCharge = true })
        setLoading(dr=>{ dr.global = true })

        const body = { set: modifyChargeInfo, where: { id } };
        try {
            const response = await updateDataToTable("charge", body);
            if (response.success === true) {
                setChargeListe(draft => {
                    const target = draft.find(c => c.id === id);
                    if (target) {
                        if (modifyChargeInfo.name)   target.name   = modifyChargeInfo.name;
                        if (modifyChargeInfo.amount)  target.amount = modifyChargeInfo.amount;
                    }
                });
                setModifChargeOpenId(null);
            } else {
                setError('Un probleme serveur est survenu');
            }
        } catch (error) {
            setError('Un proble de connection est survenu');
        } finally {
            resetModifyCharge();
            setOperating(dr=>{ dr.updateCharge = false })
            setLoading(dr=>{ dr.global = false })
        }
    }

    async function deleteCharge(id: number) {
        if (isOperating.deleteCharge === true) return;
        setOperating(dr=>{ dr.deleteCharge = true })
        setLoading(dr=>{ dr.global = true })

        const body = { contraints: { id }, returning: false };
        try {
            const response = await deleteDataFromTable("charge", body);
            if (response.success === true) {
                setChargeListe(draft => {
                    const idx = draft.findIndex(c => c.id === id);
                    if (idx !== -1) draft.splice(idx, 1);
                });
            } else {
                setError('Un probleme serveur est survenu');
            }
        } catch (error) {
            setError('Un proble de connection est survenu');
        } finally {
            setOperating(dr=>{ dr.deleteCharge = false })
            setLoading(dr=>{ dr.global = false })
        }
    }
    // ---- END COMPLEMENTED charge CRUD ----

    // ---- COMPLEMENTED: cashout CRUD functions (same pattern) ----
    async function createCashout() {
        if (isOperating.createCashout === true) return;
        setOperating(dr=>{ dr.createCashout = true })
        setLoading(dr=>{ dr.global = true })

        const body = { ...newCashout, office: curentOffice, date: new Date().toISOString().split('T')[0] };
        try {
            const response: response = await createDataToTable("cashout", body);
            if (response.success === true) {
                setCashoutListe(dr=>{ dr.push({ id: response.id, name: body.name, amount: body.amount, manager_phone: body.manager_phone, date: body.date, office: body.office }) });
                setChargeGoalVisibility(dr=>{ dr.thereIsCashout = true; dr.emptyCashout = false });
            } else {
                setError('Un probleme serveur est survenu');
            }
        } catch (error) {
            setError('Un proble de connection est survenu');
        } finally {
            resetCashout();
            setShowNewCashoutForm(false);
            setOperating(dr=>{ dr.createCashout = false })
            setLoading(dr=>{ dr.global = false })
        }
    }

    async function modifyCashout(id: number) {
        if (isOperating.updateCashout === true) return;
        setOperating(dr=>{ dr.updateCashout = true })
        setLoading(dr=>{ dr.global = true })

        const body = { set: modifyCashoutInfo, where: { id } };
        try {
            const response = await updateDataToTable("cashout", body);
            if (response.success === true) {
                setCashoutListe(draft => {
                    const target = draft.find(c => c.id === id);
                    if (target) {
                        if (modifyCashoutInfo.name)   target.name   = modifyCashoutInfo.name;
                        if (modifyCashoutInfo.amount)  target.amount = modifyCashoutInfo.amount;
                    }
                });
                setModifCashoutOpenId(null);
            } else {
                setError('Un probleme serveur est survenu');
            }
        } catch (error) {
            setError('Un proble de connection est survenu');
        } finally {
            resetModifyCashout();
            setOperating(dr=>{ dr.updateCashout = false })
            setLoading(dr=>{ dr.global = false })
        }
    }

    async function deleteCashout(id: number) {
        if (isOperating.deleteCashout === true) return;
        setOperating(dr=>{ dr.deleteCashout = true })
        setLoading(dr=>{ dr.global = true })

        const body = { contraints: { id }, returning: false };
        try {
            const response = await deleteDataFromTable("cashout", body);
            if (response.success === true) {
                setCashoutListe(draft => {
                    const idx = draft.findIndex(c => c.id === id);
                    if (idx !== -1) draft.splice(idx, 1);
                });
            } else {
                setError('Un probleme serveur est survenu');
            }
        } catch (error) {
            setError('Un proble de connection est survenu');
        } finally {
            setOperating(dr=>{ dr.deleteCashout = false })
            setLoading(dr=>{ dr.global = false })
        }
    }
    // ---- END COMPLEMENTED cashout CRUD ----

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

        // COMPLEMENTED: fetch charge-goal data when that view is opened
        if (vue === 'charge-goal') {
            setLoading(draft=>{ draft.fetchGoal = true; draft.fetchCharge = true; draft.fetchCashout = true });

            const ownerKey = user.owner ? user.id : user.promoted_by;

            const fetchGoals = async () => {
                const field = { fields: ['id', 'name', 'target', 'current', 'office'], constraints: { owner: ownerKey, is_deleted: false } };
                try {
                    const data = await getDataFromTableWithConstraints('goal', field);
                    if (data.succes === true && data.list.length > 0) {
                        setGoalListe(draft=>{ draft.push(...data.list) });
                        setChargeGoalVisibility(dr=>{ dr.thereIsGoal = true; dr.emptyGoal = false });
                    } else {
                        setChargeGoalVisibility(dr=>{ dr.emptyGoal = true; dr.thereIsGoal = false });
                    }
                } catch {
                    setError('Un proble est survenu');
                } finally {
                    setLoading(draft=>{ draft.fetchGoal = false });
                }
            };

            const fetchCharges = async () => {
                const field = { fields: ['id', 'name', 'amount', 'type', 'office'], constraints: { owner: ownerKey, is_deleted: false } };
                try {
                    const data = await getDataFromTableWithConstraints('charge', field);
                    if (data.succes === true && data.list.length > 0) {
                        setChargeListe(draft=>{ draft.push(...data.list) });
                        setChargeGoalVisibility(dr=>{ dr.thereIsCharge = true; dr.emptyCharge = false });
                    } else {
                        setChargeGoalVisibility(dr=>{ dr.emptyCharge = true; dr.thereIsCharge = false });
                    }
                } catch {
                    setError('Un proble est survenu');
                } finally {
                    setLoading(draft=>{ draft.fetchCharge = false });
                }
            };

            const fetchCashouts = async () => {
                const field = { fields: ['id', 'name', 'amount', 'manager_phone', 'date', 'office'], constraints: { owner: ownerKey, is_deleted: false } };
                try {
                    const data = await getDataFromTableWithConstraints('cashout', field);
                    if (data.succes === true && data.list.length > 0) {
                        setCashoutListe(draft=>{ draft.push(...data.list) });
                        setChargeGoalVisibility(dr=>{ dr.thereIsCashout = true; dr.emptyCashout = false });
                    } else {
                        setChargeGoalVisibility(dr=>{ dr.emptyCashout = true; dr.thereIsCashout = false });
                    }
                } catch {
                    setError('Un proble est survenu');
                } finally {
                    setLoading(draft=>{ draft.fetchCashout = false });
                }
            };

            fetchGoals();
            fetchCharges();
            fetchCashouts();
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

    // COMPLEMENTED: sync chargeGoalVisibility when lists change
    useEffect(()=>{
        setChargeGoalVisibility(dr=>{
            dr.thereIsGoal = goalListe.length > 0
            dr.emptyGoal   = goalListe.length <= 0
        })
    },[goalListe])

    useEffect(()=>{
        setChargeGoalVisibility(dr=>{
            dr.thereIsCharge = chargeListe.length > 0
            dr.emptyCharge   = chargeListe.length <= 0
        })
    },[chargeListe])

    useEffect(()=>{
        setChargeGoalVisibility(dr=>{
            dr.thereIsCashout = cashoutListe.length > 0
            dr.emptyCashout   = cashoutListe.length <= 0
        })
    },[cashoutListe])

// end flow ...

    // COMPLEMENTED: computed total charges for the month
    const totalCharges = chargeListe.reduce((acc, c) => acc + c.amount, 0);

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
            { handleView('charge-goal') && <div className="goal-charge">
            <div className="goal-info surface">
                <h3>Gestion des objectifs</h3>
                <div className="goal-info-top">
                    <svg width="24" height="24" onClick={()=>{ setShowNewGoalForm(!showNewGoalForm) }} className="sidebar-icon" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                            <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                        </svg>
                    {/* COMPLEMENTED: new-goal form wired up */}
                    { showNewGoalForm && <div className="new-goal">
                        <input value={newGoal.name} onChange={(e)=>{ setNewGoal(draft=>{ draft.name = e.target.value }) }} type="text" placeholder="Nom de l'objectif" />
                        <input value={newGoal.target || ''} onChange={(e)=>{ setNewGoal(draft=>{ draft.target = Number(e.target.value) }) }} type="number" placeholder="Montant cible" />
                        <button className='create-btn' onClick={()=>{ createGoal() }}>Créer</button>
                    </div>}
                </div>
                <div className="goal-info-midlle">
                    {isLoading.fetchGoal && <p>Loading...</p>}
                    { chargeGoalVisibility.emptyGoal && <div className="no-cont-image">nothing yet...</div>}
                    { chargeGoalVisibility.thereIsGoal && goalListe.map((goal)=>(
                        <div key={goal.id} className="goal-item">
                            <div className="goal-item-top">
                                <svg width="24" height="24" className="sidebar-icon" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                                <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                                </svg>
                                {/* COMPLEMENTED: display real goal name */}
                                <p>{goal.name}</p>
                            </div>
                            <div className="goal-item-midlle">
                                <p>objectif : {goal.target}</p>
                                <p>actuel : {goal.current}</p>
                            </div>
                            <div className="goal-item-bottom">
                                {/* COMPLEMENTED: computed percentage */}
                                <p>pourcentage : {goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0}%</p>
                            </div>
                            {/* COMPLEMENTED: goal management controls */}
                            <div className="goal-managent">
                                <div className="row">
                                    <svg width="16" height="16" onClick={()=>{ setModifGoalOpenId(modifGoalOpenId === goal.id ? null : goal.id); resetModifyGoal(); }} className="modify-goal-icon" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                                        <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                                    </svg>
                                    <svg width="16" height="16" onClick={()=>{ deleteGoal(goal.id) }} className="delete-goal-icon" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                                        <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                                    </svg>
                                </div>
                                { modifGoalOpenId === goal.id && <div className="modify-zone row">
                                    <input value={modifyGoalInfo.name} onChange={(e)=>{ setModifyGoalInfo(draft=>{ draft.name = e.target.value }) }} type="text" placeholder={goal.name} />
                                    <input value={modifyGoalInfo.target || ''} onChange={(e)=>{ setModifyGoalInfo(draft=>{ draft.target = Number(e.target.value) }) }} type="number" placeholder={String(goal.target)} />
                                    <svg width="16" height="16" onClick={()=>{ modifyGoal(goal.id) }} className="validate-change" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                                        <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                                    </svg>
                                </div>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="charge-cashout-info surface">
                <h3>Gestion des charge</h3>
                <div className="charge-cashout-info-top">
                    <svg width="24" height="24" className="switcher-icon-item" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                            <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                    </svg>
                    <svg width="24" height="24" className="switcher-icon-item" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                            <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                    </svg>
                </div>
                <div className="charge-info-midlle">
                    <div className="cashout-layer">
                        <div className="cashout-layer-headedr">
                            {/* COMPLEMENTED: cashout form toggle wired up */}
                            <svg width="24" height="24" onClick={()=>{ setShowNewCashoutForm(!showNewCashoutForm) }} className="show-new-cashout-form" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                                <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                            </svg>
                            {/* COMPLEMENTED: new-cashout form wired up */}
                            { showNewCashoutForm && <div className="new-cashout">
                                <input value={newCashout.name} onChange={(e)=>{ setNewCashout(draft=>{ draft.name = e.target.value }) }} type="text" placeholder='Description' />
                                <input value={newCashout.amount || ''} onChange={(e)=>{ setNewCashout(draft=>{ draft.amount = Number(e.target.value) }) }} type="number" placeholder='Montant' />
                                <input value={newCashout.manager_phone} onChange={(e)=>{ setNewCashout(draft=>{ draft.manager_phone = e.target.value }) }} type="text" placeholder='Tel manager' />
                                <button className='create-btn' onClick={()=>{ createCashout() }}>Créer</button>
                            </div>}
                        </div>
                        <div className="cashout-layer-body">
                            {isLoading.fetchCashout && <p>Loading...</p>}
                            { chargeGoalVisibility.emptyCashout && <div className="no-cont-image">nothing yet...</div>}
                            {/* COMPLEMENTED: cashout list rendered from state */}
                            { chargeGoalVisibility.thereIsCashout && cashoutListe.map((cashout)=>(
                                <div key={cashout.id} className="cashout-item">
                                    <div className="row">
                                        <svg width="16" height="16" className="cashout-icon" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                                            <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                                        </svg>
                                        <p>{cashout.name}</p>
                                    </div>
                                    <p>{cashout.amount}f</p>
                                    <div className="row">
                                        <p>manager tel : {cashout.manager_phone}</p>
                                        <p>date : {cashout.date}</p>
                                    </div>
                                    <div className="cashout-managent">
                                        <div className="row">
                                            <svg width="16" height="16" onClick={()=>{ setModifCashoutOpenId(modifCashoutOpenId === cashout.id ? null : cashout.id); resetModifyCashout(); }} className="modify-cashout-icon" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                                                <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                                            </svg>
                                            <svg width="16" height="16" onClick={()=>{ deleteCashout(cashout.id) }} className="delete-cashout-icon" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                                                <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                                            </svg>
                                        </div>
                                        { modifCashoutOpenId === cashout.id && <div className="modify-zone row">
                                            <input value={modifyCashoutInfo.name} onChange={(e)=>{ setModifyCashoutInfo(draft=>{ draft.name = e.target.value }) }} type="text" placeholder={cashout.name} />
                                            <input value={modifyCashoutInfo.amount || ''} onChange={(e)=>{ setModifyCashoutInfo(draft=>{ draft.amount = Number(e.target.value) }) }} type="number" placeholder={String(cashout.amount)} />
                                            <svg width="16" height="16" onClick={()=>{ modifyCashout(cashout.id) }} className="validate-change" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                                                <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                                            </svg>
                                        </div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="charge-layer">
                        <div className="type-indicator">
                            <div className="fix">
                                <svg width="24" height="24" className="boule-color" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                                    <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                                </svg>
                                <p>fixe</p>
                            </div>
                            <div className="variable">
                                <svg width="24" height="24" className="sboule-color" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                                    <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                                </svg>
                                <p>variable</p>
                            </div>
                        </div>
                        <div className="charge-layer-headedr">
                            {/* COMPLEMENTED: charge form toggle wired up */}
                            <svg width="24" height="24" onClick={()=>{ setShowNewChargeForm(!showNewChargeForm) }} className="show-new-charge-form" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                                <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                            </svg>
                            {/* COMPLEMENTED: new-charge form wired up */}
                            { showNewChargeForm && <div className="new-charge">
                                <input value={newCharge.name} onChange={(e)=>{ setNewCharge(draft=>{ draft.name = e.target.value }) }} type="text" placeholder='Nom de la charge' />
                                <input value={newCharge.amount || ''} onChange={(e)=>{ setNewCharge(draft=>{ draft.amount = Number(e.target.value) }) }} type="number" placeholder='Montant' />
                                <select value={newCharge.type} onChange={(e)=>{ setNewCharge(draft=>{ draft.type = e.target.value as 'fixe' | 'variable' }) }}>
                                    <option value="fixe">Fixe</option>
                                    <option value="variable">Variable</option>
                                </select>
                                <button className='create-btn' onClick={()=>{ createCharge() }}>Créer</button>
                            </div>}
                        </div>
                        <div className="charge-layer-body">
                            {isLoading.fetchCharge && <p>Loading...</p>}
                            { chargeGoalVisibility.emptyCharge && <div className="no-cont-image">nothing yet...</div>}
                            {/* COMPLEMENTED: charge list rendered from state */}
                            { chargeGoalVisibility.thereIsCharge && chargeListe.map((charge)=>(
                                <div key={charge.id} className="charge-item">
                                    <div className="row">
                                        <svg width="16" height="16" className="charge-fix-orvariable-icon" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                                            <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                                        </svg>
                                        {/* COMPLEMENTED: display charge name and type */}
                                        <p>{charge.name} ({charge.type})</p>
                                    </div>
                                    <p>{charge.amount}f</p>
                                    <div className="charge-managent">
                                        <div className="row">
                                            <svg width="16" height="16" onClick={()=>{ setModifChargeOpenId(modifChargeOpenId === charge.id ? null : charge.id); resetModifyCharge(); }} className="modify-charge-icon" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                                                <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                                            </svg>
                                            <svg width="16" height="16" onClick={()=>{ deleteCharge(charge.id) }} className="delete-charge-icon" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                                                <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                                            </svg>
                                        </div>
                                        { modifChargeOpenId === charge.id && <div className="modify-zone row">
                                            <input value={modifyChargeInfo.name} onChange={(e)=>{ setModifyChargeInfo(draft=>{ draft.name = e.target.value }) }} type="text" placeholder={charge.name} />
                                            <input value={modifyChargeInfo.amount || ''} onChange={(e)=>{ setModifyChargeInfo(draft=>{ draft.amount = Number(e.target.value) }) }} type="number" placeholder={String(charge.amount)} />
                                            <svg width="16" height="16" onClick={()=>{ modifyCharge(charge.id) }} className="validate-change" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                                                <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                                            </svg>
                                        </div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="charge-footer">
                            {/* COMPLEMENTED: computed total from state */}
                            <p>total du mois : {totalCharges}f</p>
                        </div>
                    </div>
                </div>
            </div>
            </div>}
        </main>
    );
}
