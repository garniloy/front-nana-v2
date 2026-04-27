// url backend here
const backendUrl = 'http://localhost:3000/crud/';

// globale functions here


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
    const res = await fetch(backendUrl +  'getwith/' + table, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log(data);
    return data
};



// global actions
const user = JSON.parse(localStorage.getItem("user") || "null");
const connected = localStorage.getItem("connected");

// TYPES
    type Office = {
        id: number;
        name: string
    };

    type OfficeSelectorProps = {
    offices?: Office[];
    gave?: boolean;
    onOfficeSelect?: (officeName: string) => void;
    };
// imports
import '../css/sudo.css'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';

// main function
export default function OfficeSelector({
                                            offices = [],
                                            gave = false,
                                            onOfficeSelect}: OfficeSelectorProps) {

    const navigate = useNavigate()
    const [officeList, setOffices] = useState<Office[]>([]);
    const [selectedOffice, setSelectedOffice] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (gave === true) {
            setOffices(offices);
        }else{
            const field = {
                fields: ['id', 'name'],
                constraints: { owner: user.owner ? user.id :user.promoted_by, is_deleted: false }
            };
            const fetchdata = async ()=>{
                try {
                    const data = await getDataFromTableWithConstraints('office', field)
                    console.log(data)
                    if (data.success === true) {
                        const alloffices = data.list;
                        console.log(alloffices)

                        // COMPLEMENTED: check fetched offices array, not existing state
                        if (alloffices.length > 0) {
                            setOffices(alloffices);
                        }else{
                            setError('Aucun bureau disponible')
                        }
                    }else{
                        
                        setError('Un proble est survenu')
                    }
                } catch (error) {
                    
                    setError('Un proble est survenu')
                }
                
                
            }

            fetchdata();
            
        }
    },[]);

    useEffect(()=>{
        if (officeList.length > 0) {
            setSelectedOffice(officeList[0].name);
        }
        onOfficeSelect?.(selectedOffice);

    }, [officeList]);

    // Redirect
    useEffect(() => {
    if (!connected || !user) {
        localStorage.removeItem("user");
        localStorage.removeItem("connected");
        navigate("/login");
    }
    }, [connected, user, navigate]);

    // FLOW --- > opening [] -> set view ; react[setview] -> fetch related data : office-manager view (when office able, set first item as selected office, [selectedoffice]-> get managers...), charge-goal view(fetch charge, cashout and goals, display and manage)

    

   

    return(
        <div className='btn'>
            {!error && (
                <div className="list">
                    <select name="select-office" id="select-office">
                        {officeList.map((office:Office)=>(<option className={selectedOffice === office.name ? "selected" : ""} key={office.id} value={office.name} onClick={()=>{setSelectedOffice(office.name)}}>{office.name}</option>))}
                    </select>
                
            </div>
            )}
            {error &&<p>{error}</p>}
        </div>
        
    )
}