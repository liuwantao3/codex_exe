import { Buffer } from "buffer";
export function getUser() {
    console.log('getUser called');
   
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      return null;
    }
  
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));

    console.log(payload);
    return payload.username;
}