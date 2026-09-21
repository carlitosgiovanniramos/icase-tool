"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Login() {
    const [correo, setCorreo] = useState( "" );
    const [contrasena, setContrasena] = useState( "" );
    const [error, setError] = useState( "" );
    const [cargando, setCargando] = useState( false );
    const router = useRouter();

    const handleSubmit = async ( e ) => {
        e.preventDefault();
        setCargando( true );
        setError( "" );

        const { error: errorAuth } = await supabase.auth.signInWithPassword( {
            email: correo,
            password: contrasena,
        } );

        setCargando( false );

        if ( errorAuth ) {
            setError( "Correo o contraseña incorrectos." );
            return;
        }

        router.push( "/" );
    };

    return (
        <div className="max-w-sm mx-auto mt-12">
            <h1 className="text-2xl font-bold mb-6">Iniciar sesión</h1>
            <form onSubmit={ handleSubmit } className="flex flex-col gap-4">
                <input type="email" placeholder="Correo" value={ correo }
                    onChange={ ( e ) => setCorreo( e.target.value ) } required
                    className="border rounded-lg p-2" />
                <input type="password" placeholder="Contraseña" value={ contrasena }
                    onChange={ ( e ) => setContrasena( e.target.value ) } required
                    className="border rounded-lg p-2" />
                { error && <p className="text-red-600 text-sm">{ error }</p> }
                <button type="submit" disabled={ cargando }
                    className="bg-gray-900 text-white rounded-lg p-2">
                    { cargando ? "Entrando..." : "Entrar" }
                </button>
                <a href="/recuperar-password" className="text-sm text-blue-600 text-center">
                    ¿Olvidaste tu contraseña?
                </a>
            </form>
        </div>
    );
}