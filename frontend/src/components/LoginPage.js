import Signup from './Signup';
import Login from './Login';
import { Account } from './Account';
import Status from './Status';

function LoginPage() {
  return (
    <Account>
      <Status/>
      <Signup/>
      <Login/>
    </Account>
  );
}

export default LoginPage;
