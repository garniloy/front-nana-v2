const backendUrl = 'https://backend-nana-v2.onrender.com/crud/';

const getDataFromTableWithConstraints = async (table: string, body: object) => {
    const res = await fetch(backendUrl + 'getwith/' + table, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    console.log(data);
    return data;
};

const user = JSON.parse(localStorage.getItem('user') || 'null');
const connected = localStorage.getItem('connected');

type Office = {
    id: number;
    name: string;
};

type OfficeSelectorProps = {
    offices?: Office[];
    gave?: boolean;
    onOfficeSelect?: (officeName: string) => void;
};

import '../css/sudo.css';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function OfficeSelector({
    offices = [],
    gave = false,
    onOfficeSelect,
}: OfficeSelectorProps) {
    const navigate = useNavigate();
    const [officeList, setOffices] = useState<Office[]>([]);
    const [selectedOffice, setSelectedOffice] = useState('');
    const [error, setError] = useState('');

    // Redirect if not connected
    useEffect(() => {
        if (!connected || !user) {
            localStorage.removeItem('user');
            localStorage.removeItem('connected');
            navigate('/login');
        }
    }, []);

    // Case 1: offices provided by parent — sync whenever the prop changes.
    // `offices` is an array prop so its reference is stable as long as the parent
    // doesn't re-create it inline (e.g. gave={true} offices={myStateArray} is fine;
    // gave={true} offices={[...]} literal would still loop — that's the caller's responsibility).
    useEffect(() => {
        if (gave !== true) return;
        setOffices(offices);
    }, [gave, offices]);

    // Case 2: fetch from API — runs once on mount only.
    // We intentionally omit `gave` from deps: it is a mount-time decision and
    // cannot change without unmounting the component anyway.
    useEffect(() => {
        if (gave === true) return;

        const field = {
            fields: ['id', 'name'],
            constraints: {
                owner: user.owner ? user.id : user.promoted_by,
                is_deleted: false,
            },
        };

        const fetchdata = async () => {
            try {
                const data = await getDataFromTableWithConstraints('office', field);
                if (data.success === true) {
                    if (data.list.length > 0) {
                        setOffices(data.list);
                    } else {
                        setError('Aucun bureau disponible');
                    }
                } else {
                    setError('Un problème est survenu');
                }
            } catch {
                setError('Un problème est survenu');
            }
        };

        fetchdata();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-select the first office and notify the parent whenever the list is (re)loaded
    useEffect(() => {
        if (officeList.length === 0) return;
        const firstName = officeList[0].name;
        setSelectedOffice(firstName);
        // Use firstName directly — reading selectedOffice here would be a stale closure
        onOfficeSelect?.(firstName);
    }, [officeList]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const name = e.target.value;
        setSelectedOffice(name);
        onOfficeSelect?.(name);
    };

    return (
        <div className="btn">
            {!error && (
                <div className="list">
                    <select
                        name="select-office"
                        id="select-office"
                        value={selectedOffice}
                        onChange={handleChange}
                    >
                        {officeList.map((office: Office) => (
                            <option key={office.id} value={office.name}>
                                {office.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            {error && <p>{error}</p>}
        </div>
    );
}