import { MapPin } from 'lucide-react-native';
import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Dummy provider for compatibility
export const PROVIDER_GOOGLE = 'google';

export const Marker = ({ coordinate, title, description }: any) => null;

const MapView = forwardRef((props: any, ref) => {
    const { style } = props;

    return (
        <View style={[styles.container, style]}>
            <View style={styles.placeholder}>
                <MapPin size={40} color="#666" />
                <Text style={styles.text}>Map View</Text>
                <Text style={styles.subtext}>(Native Only)</Text>
            </View>
        </View>
    );
});

MapView.displayName = 'MapView';

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
    },
    placeholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    subtext: {
        fontSize: 12,
        color: '#666',
    }
});

export default MapView;
