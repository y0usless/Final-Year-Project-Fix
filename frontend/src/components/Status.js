import React, { useState, useContext, useEffect } from "react";
import { AccountContext } from "./Account";

const Status = () => {
    const [status, getStatus] = useState(false);

    const { getSession, logout } = useContext(AccountContext);

    useEffect(() =>{
        getSession()
            .then(session => {
                console.log("Session:", session);
                getStatus(true);
            })
    })

    return <div>{status ? (<button onClick={logout}>Logout</button>) : "Please Login"}</div>
}

export default Status;