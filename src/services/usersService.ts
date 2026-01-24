// axios
// fetch

// zustand
// redux toolkit

import BASE_URL from "./base_url";


export const fetchUsers = async () => {
    const res = await fetch(`${BASE_URL}/users`,{
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    const data =  await res.json();
    return data;
};

