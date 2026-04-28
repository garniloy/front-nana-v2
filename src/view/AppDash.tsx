

import { NavLink, Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import '../css/appDash.css'


export default function Appdash() {
    const permitions = {
		ownerview : {status : true},
		formview : {status : true},
		statview : {status : true},
		dbview : {status : true},
		settingview : {status : true},
		planview : {status : true}
	}
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const connected = localStorage.getItem("connected");
    

    
    if (!connected || user === "null") {
        navigate('/login');
    }

    //get permissions and verify if office is working



    return(
        
            <div className="main" >
                <div className="cadre">
                    <div className="display-zone">
                        <div className="side-zone" data-style="neuro" data-mode="light">
                            <div className="colabse-menu btn">
                                <svg width="24" height="24" className="sidebar-icon" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z"></path>
                                    <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z"></path>
                                </svg>
                            </div>
                            <div className="sidebar"  >

                                {permitions.formview.status && 
                                <NavLink className= {({ isActive }) => isActive ? "nav-item  active" : "nav-item btn"}  to="/app/formulaires">
                                    <svg width="24" height="24" className="sidebar-icon " fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20 2H8c-1.103 0-2 .897-2 2v12c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2ZM8 16V4h12l.002 12H8Z"></path>
                                        <path d="M4 8H2v12c0 1.103.897 2 2 2h12v-2H4V8Zm11-2h-2v3h-3v2h3v3h2v-3h3V9h-3V6Z"></path>
                                    </svg>
                                    <p>Formulaires</p>
                                </NavLink>}

                                {permitions.statview.status && 
                                <NavLink className= {({ isActive }) => isActive ? "nav-item  active" : "nav-item btn"}  to="/app/statistiques">
                                    <svg width="24" height="24" className="sidebar-icon" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20 12a2 2 0 0 0-.703.133l-2.398-1.963c.059-.214.101-.436.101-.67C17 8.114 15.886 7 14.5 7A2.493 2.493 0 0 0 12 9.5c0 .396.1.765.262 1.097l-2.909 3.438A2.06 2.06 0 0 0 9 14c-.179 0-.348.03-.512.074l-2.563-2.563C5.97 11.348 6 11.179 6 11c0-1.108-.892-2-2-2s-2 .892-2 2 .892 2 2 2c.179 0 .348-.03.512-.074l2.563 2.563A1.906 1.906 0 0 0 7 16c0 1.108.892 2 2 2s2-.892 2-2c0-.237-.048-.46-.123-.671l2.913-3.442c.227.066.462.113.71.113a2.48 2.48 0 0 0 1.133-.281l2.399 1.963A2.08 2.08 0 0 0 18 14c0 1.108.892 2 2 2s2-.892 2-2-.892-2-2-2Z"></path>
                                    </svg>
                                    <p>Statistiques</p>
                                </NavLink>}

                                {permitions.dbview.status && 
                                <NavLink className= {({ isActive }) => isActive ? "nav-item  active" : "nav-item btn"}  to="/app/visualiseur-de-donnee">
                                    <svg width="24" height="24" className="sidebar-icon" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M21.512 6.11 17.622 10l-3.535-3.537 3.89-3.889a6.501 6.501 0 0 0-8.485 8.486l-6.276 6.275a1 1 0 0 0 0 1.414l2.122 2.122a.998.998 0 0 0 1.414 0l6.275-6.276a6.501 6.501 0 0 0 8.485-8.485Z"></path>
                                    </svg>
                                    <p>Visualiseur de donnee</p>
                                </NavLink>}

                                {permitions.settingview.status && 
                                <NavLink to="/app/parametres" className= {({ isActive }) => isActive ? "nav-item  active" : "nav-item btn"} >
                                    <svg width="24" height="24" className="sidebar-icon" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 16c2.206 0 4-1.794 4-4s-1.794-4-4-4-4 1.794-4 4 1.794 4 4 4Zm0-6c1.084 0 2 .916 2 2s-.916 2-2 2-2-.916-2-2 .916-2 2-2Z"></path>
                                        <path d="m2.845 16.136 1 1.73c.531.917 1.809 1.261 2.73.73l.529-.306A8.1 8.1 0 0 0 9 19.402V20c0 1.103.897 2 2 2h2c1.103 0 2-.897 2-2v-.598a8.132 8.132 0 0 0 1.896-1.111l.529.306c.923.53 2.198.188 2.731-.731l.999-1.729a2.001 2.001 0 0 0-.731-2.732l-.505-.292a7.723 7.723 0 0 0 0-2.224l.505-.292a2.002 2.002 0 0 0 .731-2.732l-.999-1.729c-.531-.92-1.808-1.265-2.731-.732l-.529.306A8.101 8.101 0 0 0 15 4.598V4c0-1.103-.897-2-2-2h-2c-1.103 0-2 .897-2 2v.598a8.132 8.132 0 0 0-1.896 1.111l-.529-.306c-.924-.531-2.2-.187-2.731.732l-.999 1.729a2.001 2.001 0 0 0 .731 2.732l.505.292a7.683 7.683 0 0 0 0 2.223l-.505.292a2.003 2.003 0 0 0-.731 2.733Zm3.326-2.758A5.703 5.703 0 0 1 6 12c0-.462.058-.926.17-1.378a.999.999 0 0 0-.47-1.108l-1.123-.65.998-1.729 1.145.662a.997.997 0 0 0 1.188-.142 6.071 6.071 0 0 1 2.384-1.399A1 1 0 0 0 11 5.3V4h2v1.3a1 1 0 0 0 .708.956 6.083 6.083 0 0 1 2.384 1.399.999.999 0 0 0 1.188.142l1.144-.661 1 1.729-1.124.649a1 1 0 0 0-.47 1.108c.112.452.17.916.17 1.378 0 .461-.058.925-.171 1.378a1 1 0 0 0 .471 1.108l1.123.649-.998 1.729-1.145-.661a.996.996 0 0 0-1.188.142 6.072 6.072 0 0 1-2.384 1.399A1 1 0 0 0 13 18.7l.002 1.3H11v-1.3a1 1 0 0 0-.708-.956 6.083 6.083 0 0 1-2.384-1.399.992.992 0 0 0-1.188-.141l-1.144.662-1-1.729 1.124-.651a1 1 0 0 0 .471-1.108Z"></path>
                                    </svg>
                                    <p>Parametres</p>
                                </NavLink>}

                                {permitions.planview.status && 
                                <NavLink className= {({ isActive }) => isActive ? "nav-item  active" : "nav-item btn"}  to="/app/abonnement">
                                    <svg width="24" height="24" className="sidebar-icon" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M16 12h2v4h-2v-4Z"></path>
                                        <path d="M20 7V5c0-1.103-.897-2-2-2H5C3.346 3 2 4.346 2 6v12c0 2.201 1.794 3 3 3h15c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2ZM5 5h13v2H5a1.001 1.001 0 0 1 0-2Zm15 14H5.012C4.55 18.988 4 18.805 4 18V8.815c.314.113.647.185 1 .185h15v10Z"></path>
                                    </svg>
                                    <p>Abonnement</p>
                                </NavLink>}

                                {permitions.ownerview.status && 
                                <NavLink className= {({ isActive }) => isActive ? "nav-item  active" : "nav-item btn"}  to="/app/super-utilisateur">
                                    <svg width="24" height="24" className="sidebar-icon" fill="#3f4a41" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20.995 6.904a.997.997 0 0 0-.547-.797l-7.973-4a.997.997 0 0 0-.895-.002l-8.027 4c-.297.15-.502.437-.544.767-.013.097-1.145 9.741 8.54 15.008a.995.995 0 0 0 .97-.009c9.307-5.259 8.514-14.573 8.476-14.967Zm-8.977 12.944c-6.86-4.01-7.14-10.352-7.063-12.205l7.07-3.523 6.999 3.511c.005 1.87-.481 8.243-7.006 12.217Z"></path>
                                    </svg>
                                    <p>Super-utilisateur</p>
                                </NavLink>}
                            </div>
                        </div>
                        <div data-style="neuro" data-mode="light" className="right-zone">
                            <Outlet />
                        </div>
                    </div>
                </div>
            </div>
        
    )
}