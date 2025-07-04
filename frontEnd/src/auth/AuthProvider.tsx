/* esto es un componente para utilizar context para guardar el estado y las funciones */
// valida constantemente  las autentificaciones para dejar pasar a las rutas protegidas, y poder acceder informacion desde el backend al frontend
import { useContext, createContext, useState, useEffect } from "react";
import type { AuthResponse, User } from "../types/types";
import requestNewAccessToken from "./requestNewAccessToken";
import { API_URL } from "./authConstants";

const AuthContext = createContext({
  isAuthenticated: false,
  getAccessToken: () => {},
  setAccessTokenAndRefreshToken: (
    _accessToken: string,
    _refreshToken: string
  ) => {},
  getRefreshToken: () => {},
  saveUser: (_userData: AuthResponse) => {},
  getUser: () => ({} as User | undefined),
  signout: () => {},
});

interface AuthProviderProps {
  children: React.ReactNode;
}//interfaz para que no salga error de typescrypt con el children

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | undefined>();
  const [accessToken, setAccessToken] = useState<string>("");
  const [refreshToken, setRefreshToken] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isloading, setIsLoading] = useState(true);

  function getAccessToken() {
    return accessToken;
  } //Devuelve el token de acceso actual guardado en memoria.

  function saveUser(userData: AuthResponse) {
    setAccessTokenAndRefreshToken(
      userData.body.accessToken,
      userData.body.refreshToken
    );
    setUser(userData.body.user);
    setIsAuthenticated(true);
  }//Guarda los tokens y los datos del usuario una vez que el backend responde exitosamente al iniciar sesión.

  function setAccessTokenAndRefreshToken(
    accessToken: string,
    refreshToken: string
  ) {
    console.log("setAccessTokenAndRefreshToken", accessToken, refreshToken);
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);

    localStorage.setItem("token", JSON.stringify({ refreshToken }));
  }//Guarda el accessToken y refreshToken en estado local. Guarda solo el refreshToken en localStorage

  function getRefreshToken() {
    if (!!refreshToken) {
      return refreshToken;
    }
    const token = localStorage.getItem("token");
    if (token) {
      const { refreshToken } = JSON.parse(token);
      setRefreshToken(refreshToken);
      return refreshToken;
    }
    return null;
  }// Si ya tiene el refreshToken en estado, lo devuelve. Si no, lo busca en localStorage

  async function getNewAccessToken(refreshToken: string) {
    const token = await requestNewAccessToken(refreshToken);
    if (token) {
      return token;
    }
  }// Solicita un nuevo accessToken al backend usando el refreshToken. Si lo obtiene, lo devuelve.

  function getUser(): User | undefined {
    return user;
  }// Devuelve el usuario actual guardado en estado. Para mostrar en la interfaz datos del usuario (como nombre, correo, etc.).

  function signout() {
    localStorage.removeItem("token");
    setAccessToken("");
    setRefreshToken("");
    setUser(undefined);
    setIsAuthenticated(false);
  }// Cierra la sesión del usuario, eliminando los tokens y el usuario del estado. También borra el refreshToken de localStorage.

  async function checkAuth() {// Verifica si el usuario ya está autenticado al cargar la aplicación.
    try {// Verifica si ya hay un accessToken en estado.
      if (!!accessToken) {
        //existe access token
        const userInfo = await retrieveUserInfo(accessToken);
        setUser(userInfo);
        setAccessToken(accessToken);
        setIsAuthenticated(true);
        setIsLoading(false);
      } else {
        //no existe access token
        const token = localStorage.getItem("token");
        if (token) {
          console.log("useEffect: token", token);
          const refreshToken = JSON.parse(token).refreshToken;
          //pedir nuevo access token
          getNewAccessToken(refreshToken)
            .then(async (newToken) => {
              const userInfo = await retrieveUserInfo(newToken!);
              setUser(userInfo);
              setAccessToken(newToken!);
              setIsAuthenticated(true);
              setIsLoading(false);
            })
            .catch((error) => {
              console.log(error);
              setIsLoading(false);
            });
        } else {
          setIsLoading(false);
        }
      }
    } catch (error) {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);// Al cargar el componente, verifica si el usuario ya está autenticado.

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        getAccessToken,
        setAccessTokenAndRefreshToken,
        getRefreshToken,
        saveUser,
        getUser,
        signout,
      }}
    >
      {isloading ? <div>Loading...</div> : children}
    </AuthContext.Provider>
  );
}
//ojo si es este pedaso que revisa la info de la base de datos
async function retrieveUserInfo(accessToken: string) {
  try {
    const response = await fetch(`${API_URL}/Usuarios`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const json = await response.json();
      console.log(json);
      return json.body;
    }
  } catch (error) {}
}// Hace una solicitud al backend para obtener la información del usuario autenticado usando su accessToken.
//  Si la solicitud es exitosa, devuelve los datos del usuario.

export const useAuth = () => useContext(AuthContext);



/* ¿Qué hace este AuthProvider?
Crea un contexto AuthContext que contiene funciones clave:

Iniciar sesión (saveUser)

Obtener tokens (getAccessToken, getRefreshToken)

Guardar tokens (setAccessTokenAndRefreshToken)

Obtener al usuario actual (getUser)

Cerrar sesión (signout)

Comprobar la autenticación al iniciar la app (checkAuth) */

/* ¿Qué funcionalidades permite?
Manejo de sesión:
Guarda el accessToken en memoria y el refreshToken en localStorage.

Recupera automáticamente un nuevo accessToken si está ausente, usando refreshToken.

Persistencia:
Al recargar la página, si hay un refreshToken guardado, intenta renovar el accessToken y recuperar al usuario (checkAuth()).

Obtención de datos del usuario:
retrieveUserInfo(accessToken) llama al endpoint /Usuarios para traer la información del usuario autenticado usando su token.

Cierre de sesión:
signout() borra los tokens, el usuario y el estado de autenticación.

Componente de carga:
Mientras verifica si el usuario ya está autenticado, muestra <div>Loading...</div> hasta terminar. */