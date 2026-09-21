"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Registro() {
    const [nombre, setNombre] = useState( "" );
    const [correo, setCorreo] = useState( "" );
    const [contrasena, setContrasena] = useState( "" );
    const [error, setError] = useState( "" );
    const [cargando, setCargando] = useState( false );
    const router = useRouter();

    const handleSubmit = async ( e ) => {
        e.preventDefault();
        setCargando( true );
        setError( "" );

        const { data, error: errorAuth } = await supabase.auth.signUp( {
            email: correo,
            password: contrasena,
        } );

        if ( errorAuth ) {
            setError( errorAuth.message );
            setCargando( false );
            return;
        }

        // Guarda el nombre en la tabla perfiles (creada por Evelyn)
        if ( data.user ) {
            await supabase.from( "perfiles" ).insert( { id: data.user.id, nombre } );
        }

        setCargando( false );
        alert( "Cuenta creada. Revisa tu correo si Supabase pide confirmación." );
        router.push( "/login" );
    };

    return (
        <div className="max-w-sm mx-auto mt-12">
            <h1 className="text-2xl font-bold mb-6">Crear cuenta</h1>
            <form onSubmit={ handleSubmit } className="flex flex-col gap-4">
                <input type="text" placeholder="Nombre" value={ nombre }
                    onChange={ ( e ) => setNombre( e.target.value ) } required
                    className="border rounded-lg p-2" />
                <input type="email" placeholder="Correo" value={ correo }
                    onChange={ ( e ) => setCorreo( e.target.value ) } required
                    className="border rounded-lg p-2" />
                <input type="password" placeholder="Contraseña" value={ contrasena }
                    onChange={ ( e ) => setContrasena( e.target.value ) } required minLength={ 6 }
                    className="border rounded-lg p-2" />
                { error && <p className="text-red-600 text-sm">{ error }</p> }
                <button type="submit" disabled={ cargando }
                    className="bg-gray-900 text-white rounded-lg p-2">
                    { cargando ? "Creando..." : "Crear cuenta" }
                </button>
            </form>
        </div>
    );
}