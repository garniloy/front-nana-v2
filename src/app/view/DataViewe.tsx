
export default function Register(){
    return(
        <>
            <div className="table-list row">
                <p>client</p>
                <p>vendeur</p>
                <p>appro</p>
            </div>
            <div className="data-wrapper">
                <p>table state</p>
                <div className="table-column">
                    <p>id</p>
                    <p>nom</p>
                    <p>montant</p>
                </div>
                <div className="table-data">
                    <div className="loading-show"></div>
                    <div className="data-show"></div>
                </div>
                <div className="modified-zone">
                    <button>skip modifications</button>
                    <button>save modifications</button>
                </div>
            </div>
        </>
    )
}