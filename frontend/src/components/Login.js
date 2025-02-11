import React, { useState, useContext } from "react";
import { AccountContext } from "./Account";
import { useNavigate } from "react-router-dom";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const { authenticate } = useContext(AccountContext);
    const navigate = useNavigate();

    const onSubmit = (event) => {
        event.preventDefault();

        authenticate(email,password)
            .then(data => {
                console.log("Logged In", data);
                navigate("/watchroom")
            })
            .catch(err => {
                console.error("Failed to Login", err);
            })
    }
    return (
        <div>
            <form onSubmit={onSubmit}>
                <label htmlFor="email">Email</label>
                <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                ></input>
                <label htmlFor="password">Password</label>
                <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                ></input>
                <button type="submit">Login</button>
            </form>

        </div>
    )
}

export default Login;