// OfficeSelector.tsx
import '../css/form.css';
import '../css/sudo.css';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const backendUrl = 'https://backend-nana-v2.onrender.com';

const getDataFromTableWithConstraints = async (table: string, body: object) => {
    const res = await fetch(backendUrl + '/crud/getwith/' + table, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res.json();
};




type Office = { id: number; name: string };

type OfficeSelectorProps = {
    offices?: Office[];
    gave?: boolean;
    onOfficeSelect?: (officeName: string) => void;
};

export default function OfficeSelector({
    offices = [],
    gave = false,
    onOfficeSelect,
}: OfficeSelectorProps) {
    const navigate = useNavigate();
    const [officeList, setOfficeList] = useState<Office[]>([]);
    const [selectedOffice, setSelectedOffice] = useState('');
    const [error, setError] = useState('');

    // ── garde pour n'appeler onOfficeSelect qu'UNE SEULE FOIS à l'init ──
    const initializedRef = useRef(false);
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const connected = localStorage.getItem('connected');

    useEffect(() => {
        if (!connected || !user) {
            navigate('/login')
        }
    }, [user, connected]);

    // Case 1 : liste fournie par le parent
    useEffect(() => {
        if (gave !== true) return;
        setOfficeList(offices);
        initializedRef.current = false; // reset si la liste change
    }, [gave, offices]);

    // Case 2 : fetch depuis l'API — une seule fois au montage
    useEffect(() => {
        if (gave === true) return;

        const field = {
            fields: ['id', 'name'],
            constraints: {
                owner: user?.owner ? user?.id : user?.promoted_by,
                is_deleted: false,
            },
        };

        const fetchdata = async () => {
            try {
                const data = await getDataFromTableWithConstraints('office', field);
                if (data.success === true) {
                    if (data.list.length > 0) {
                        setOfficeList(data.list);
                    } else {
                        setError('Aucun bureau disponible');
                    }
                } else {
                    setError(`Un problème est survenu: ${data.message}`);
                }
            } catch {
                setError('Un problème est survenu');
            }
        };

        fetchdata();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-sélection du PREMIER bureau — une seule fois après le chargement
    useEffect(() => {
        if (officeList.length === 0) return;
        if (initializedRef.current) return; // ← ne pas réinitialiser si déjà fait
        initializedRef.current = true;

        const firstName = officeList[0].name;
        setSelectedOffice(firstName);
        onOfficeSelect?.(firstName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [officeList]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const name = e.target.value;
        setSelectedOffice(name);
        onOfficeSelect?.(name);
    };

    return (
        <div className="btn" data-style="neuro" data-mode="light">
            {!error ? (
                <select
                    name="select-office"
                    id="select-office"
                    value={selectedOffice}
                    onChange={handleChange}
                    className="btn btn-ghost text-sm"
                    style={{ border: 'none' }}
                >
                    {officeList.map((office) => (
                        <option key={office.id} value={office.name}>
                            {office.name}
                        </option>
                    ))}
                </select>
            ) : (
                <p>{error}</p>
            )}
        </div>
    );
}