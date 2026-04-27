import '../css/form.css';
import Appro from "../components/Approform";
import Vente from "../components/VenteForm";
import Client from "../components/Client";
import Distributeur from "../components/Distributeur"
import { useState } from 'react'

export default function Register(){
    const [contentLevel, setContentLevel] = useState(false)
    const [activeForm, setActiveForm] = useState('')
    function compaire(nom:string) {
        if (nom === activeForm) {
            return true
        };
        return false
    }
    function handleFormChoise(name : string) {
        setActiveForm(name);
        setContentLevel(true);
    }
    
    return(
        <div className="form-container" data-style="glass" data-mode="light">
            {!contentLevel && <div onClick={()=>{handleFormChoise('appro')}} className="form-item surface">Appro</div>}
            {!contentLevel && <div onClick={()=>{handleFormChoise('vente')}} className="form-item surface">Vente</div>}
            {!contentLevel && <div onClick={()=>{handleFormChoise('client')}} className="form-item surface">Client</div>}
            {!contentLevel && <div onClick={()=>{handleFormChoise('distributeur')}} className="form-item surface">distributeur</div>}
            {contentLevel && <div className="form-content">
                
                {compaire('appro') && <Appro onclose={()=>{
                    setActiveForm('');
                    setContentLevel(false)
                }}></Appro>}
                {compaire('vente') && <Vente onclose={()=>{
                    setActiveForm('');
                    setContentLevel(false)
                }}></Vente>}
                {compaire('client') && <Client onclose={()=>{
                    setActiveForm('');
                    setContentLevel(false)
                }}></Client>}
                {compaire('distributeur') && <Distributeur onclose={()=>{
                    setActiveForm('');
                    setContentLevel(false)
                }}></Distributeur>}
            </div>}
        </div>
    )
}